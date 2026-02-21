"""Cal.com integration — check real calendar availability and book appointments.

Env vars:
    CAL_API_KEY        — Cal.com API key (Settings → Developer → API Keys)
    CAL_EVENT_TYPE_ID  — numeric event type ID (from URL when editing an event type)
    CAL_TIMEZONE       — defaults to America/New_York
"""

import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

import httpx
from loguru import logger

CAL_BASE_URL = "https://api.cal.com"
CAL_API_VERSION = "2024-08-13"


class CalcomClient:
    """Async Cal.com v2 client for slot checking and booking."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        event_type_id: Optional[str] = None,
    ):
        self.api_key = api_key or os.getenv("CAL_API_KEY", "")
        self.event_type_id = event_type_id or os.getenv("CAL_EVENT_TYPE_ID", "")
        self.timezone = os.getenv("CAL_TIMEZONE", "America/New_York")

        if not self.api_key or not self.event_type_id:
            logger.warning(
                "[Cal.com] CAL_API_KEY or CAL_EVENT_TYPE_ID not set — "
                "agent will not be able to check availability or book"
            )

    @property
    def enabled(self) -> bool:
        return bool(self.api_key and self.event_type_id)

    @property
    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "cal-api-version": CAL_API_VERSION,
            "Content-Type": "application/json",
        }

    async def get_available_slots(self, date: str, count: int = 5) -> Dict[str, Any]:
        """Get available time slots for a specific date."""
        if not self.enabled:
            return {"status": "error", "reason": "Cal.com not configured"}

        local_tz = ZoneInfo(self.timezone)
        day_start = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=local_tz)
        day_end = day_start + timedelta(days=1)

        start_time = day_start.astimezone(ZoneInfo("UTC")).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        end_time = day_end.astimezone(ZoneInfo("UTC")).strftime("%Y-%m-%dT%H:%M:%S.000Z")

        url = f"{CAL_BASE_URL}/v2/slots/available"
        params = {
            "startTime": start_time,
            "endTime": end_time,
            "eventTypeId": self.event_type_id,
            "timeZone": self.timezone,
        }

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(url, headers=self._headers, params=params)
                resp.raise_for_status()

            data = resp.json()
            raw_slots = data.get("data", {}).get("slots", {})

            slots = []
            for day, day_slots in raw_slots.items():
                for s in day_slots:
                    time_str = s.get("time", "")
                    if time_str:
                        dt_utc = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
                        dt_local = dt_utc.astimezone(local_tz)
                        slots.append({
                            "start_time": dt_local.strftime("%H:%M"),
                            "iso": time_str,
                        })

            slots.sort(key=lambda s: s["start_time"])
            slots = slots[:count]

            logger.info(f"[Cal.com] Found {len(slots)} available slots on {date}")
            return {"status": "ok", "slots": slots, "count": len(slots)}

        except httpx.HTTPStatusError as e:
            logger.error(f"[Cal.com] Slots API error: {e.response.status_code} — {e.response.text}")
            return {"status": "error", "code": e.response.status_code, "detail": e.response.text}
        except Exception as e:
            logger.error(f"[Cal.com] Failed to fetch slots: {e}")
            return {"status": "error", "detail": str(e)}

    async def check_slot(self, date: str, time: str) -> Dict[str, Any]:
        """Check if a specific time slot is available."""
        if not self.enabled:
            return {"status": "error", "reason": "Cal.com not configured"}

        result = await self.get_available_slots(date, count=50)
        if result.get("status") != "ok":
            return result

        slots = result.get("slots", [])
        requested = time.strip()

        for slot in slots:
            if slot["start_time"] == requested:
                return {
                    "available": True,
                    "start_time": requested,
                    "iso": slot["iso"],
                }

        # Not available — find nearest alternatives
        try:
            req_minutes = int(requested.split(":")[0]) * 60 + int(requested.split(":")[1])
        except ValueError:
            req_minutes = 0

        def distance(s):
            t = s["start_time"]
            m = int(t.split(":")[0]) * 60 + int(t.split(":")[1])
            return abs(m - req_minutes)

        alternatives = sorted(slots, key=distance)[:3]
        return {
            "available": False,
            "reason": f"Slot at {requested} is not available",
            "requested_time": requested,
            "alternatives": alternatives,
        }

    async def get_bookings(self, date: str = "", attendee_name: str = "") -> Dict[str, Any]:
        """Fetch existing bookings, optionally filtered by date and/or name."""
        if not self.enabled:
            return {"status": "error", "reason": "Cal.com not configured"}

        local_tz = ZoneInfo(self.timezone)

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    f"{CAL_BASE_URL}/v2/bookings",
                    headers=self._headers,
                    params={"status": "upcoming"},
                )
                resp.raise_for_status()

            data = resp.json()
            all_bookings = data.get("data", [])
            results = []
            name_lower = attendee_name.strip().lower()

            for b in all_bookings:
                start_str = b.get("start", "")
                if not start_str:
                    continue
                dt_utc = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
                dt_local = dt_utc.astimezone(local_tz)
                booking_date = dt_local.strftime("%Y-%m-%d")

                if date and booking_date != date:
                    continue

                attendees = b.get("attendees", [])
                attendee_names = [a.get("name", "") for a in attendees]
                if name_lower and not any(name_lower in n.lower() for n in attendee_names):
                    continue

                results.append({
                    "booking_id": b.get("id"),
                    "date": booking_date,
                    "start_time": dt_local.strftime("%H:%M"),
                    "display_time": dt_local.strftime("%I:%M %p"),
                    "attendee": ", ".join(attendee_names) or "Unknown",
                    "status": b.get("status", ""),
                })

            results.sort(key=lambda r: (r["date"], r["start_time"]))
            return {"status": "ok", "bookings": results, "count": len(results)}

        except Exception as e:
            logger.error(f"[Cal.com] Failed to fetch bookings: {e}")
            return {"status": "error", "detail": str(e)}

    async def create_booking(
        self,
        date: str,
        time: str,
        attendee_name: str,
        attendee_email: str = "",
        reason: str = "",
    ) -> Dict[str, Any]:
        """Create a booking on Cal.com."""
        if not self.enabled:
            return {"status": "error", "reason": "Cal.com not configured"}

        check = await self.check_slot(date, time)
        if not check.get("available"):
            return {
                "success": False,
                "reason": check.get("reason", "Slot not available"),
                "alternatives": check.get("alternatives", []),
            }

        iso_start = check.get("iso")
        if not iso_start:
            local_tz = ZoneInfo(self.timezone)
            local_dt = datetime.strptime(f"{date}T{time}", "%Y-%m-%dT%H:%M").replace(tzinfo=local_tz)
            iso_start = local_dt.astimezone(ZoneInfo("UTC")).strftime("%Y-%m-%dT%H:%M:%S.000Z")

        if not attendee_email:
            safe_name = attendee_name.lower().replace(" ", ".")
            attendee_email = f"{safe_name}@customer.local"

        url = f"{CAL_BASE_URL}/v2/bookings"
        body = {
            "eventTypeId": int(self.event_type_id),
            "start": iso_start,
            "attendee": {
                "name": attendee_name,
                "email": attendee_email,
                "timeZone": self.timezone,
            },
            "metadata": {"reason": reason, "source": "auto-shop-voice-agent"},
        }

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(url, headers=self._headers, json=body)
                resp.raise_for_status()

            data = resp.json()
            booking = data.get("data", {})
            booking_id = booking.get("id") or booking.get("uid", "?")

            logger.success(f"[Cal.com] Booking created! {attendee_name} at {time} on {date}")
            return {
                "success": True,
                "booking_id": booking_id,
                "appointment": {
                    "date": date,
                    "start_time": time,
                    "customer_name": attendee_name,
                    "reason": reason,
                },
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"[Cal.com] Booking API error: {e.response.status_code} — {e.response.text}")
            return {"success": False, "reason": f"Cal.com API error: {e.response.status_code}"}
        except Exception as e:
            logger.error(f"[Cal.com] Booking failed: {e}")
            return {"success": False, "reason": str(e)}
