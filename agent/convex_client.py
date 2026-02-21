"""Convex HTTP client — calls our auto shop backend for parts, inventory, and orders.

Env vars:
    CONVEX_SITE_URL — the HTTP actions URL (ends in .convex.site)
"""

import base64
import json
import os
from typing import Any, Dict, List, Optional

import httpx
from loguru import logger

APIFY_ACTOR_ID = "lexis-solutions~rockauto"
CONVEX_SITE_URL_DEFAULT = "https://necessary-emu-167.convex.site"

# Maps service codes to RockAuto part category URL paths
ROCKAUTO_PATHS: Dict[str, List[str]] = {
    "oil_change":           ["engine,motoroil", "engine,oilfilter"],
    "brake_service":        ["brake%26wheelhub,discbrakepad%26lining", "brake%26wheelhub,discbrakerotor"],
    "brake_pad_replacement":["brake%26wheelhub,discbrakepad%26lining"],
    "tire_replacement":     ["tires%26wheels,tire"],
    "muffler":              ["exhaust%26emissionscontrol,muffler"],
    "transmission":         ["drivetrain,automatictransmissionfluid"],
    "general_inspection":   ["engine,oilfilter"],
}


class ConvexClient:
    """HTTP client for the auto shop Convex backend."""

    def __init__(self, site_url: Optional[str] = None):
        self.site_url = (site_url or os.getenv("CONVEX_SITE_URL", "")).rstrip("/")
        if not self.site_url:
            logger.warning(
                "[Convex] CONVEX_SITE_URL not set — parts/inventory features disabled"
            )

    @property
    def enabled(self) -> bool:
        return bool(self.site_url)

    async def lookup_customer(self, phone: str) -> Dict[str, Any]:
        """Look up a returning customer by phone number.

        Strips non-digit characters from the phone number before querying.

        Returns found=True with name, last vehicle, and visit history,
        or found=False if the number isn't in the system.
        """
        if not self.enabled:
            return {"found": False, "error": "Convex not configured"}

        # Normalize: digits only
        digits = "".join(c for c in phone if c.isdigit())
        url = f"{self.site_url}/api/customers/lookup"

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url, params={"phone": digits})
                resp.raise_for_status()

            data = resp.json()
            if data.get("found"):
                logger.info(
                    f"[Convex] CRM hit for {digits}: {data.get('customerName')} "
                    f"({data.get('visitCount')} visits)"
                )
            else:
                logger.info(f"[Convex] CRM miss for {digits} — new customer")
            return data

        except httpx.HTTPStatusError as e:
            logger.error(f"[Convex] Customer lookup error {e.response.status_code}: {e.response.text}")
            return {"found": False, "error": str(e)}
        except Exception as e:
            logger.error(f"[Convex] Customer lookup failed: {e}")
            return {"found": False, "error": str(e)}

    async def lookup_parts(
        self, year: int, make: str, model: str, service: str
    ) -> Dict[str, Any]:
        """Look up parts needed for a vehicle + service combo.

        Returns each part category with compatible parts and their inventory status.

        Args:
            year:    Vehicle year (e.g. 2018)
            make:    Vehicle make (e.g. "Honda")
            model:   Vehicle model (e.g. "Civic")
            service: Service code (e.g. "oil_change", "brake_service", "tire_replacement")
        """
        if not self.enabled:
            return {"error": "Convex not configured", "categories": []}

        url = f"{self.site_url}/api/parts/lookup"
        params = {"year": year, "make": make, "model": model, "service": service}

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()

            data = resp.json()
            logger.info(
                f"[Convex] Parts lookup: {year} {make} {model} / {service} → "
                f"{sum(len(c['parts']) for c in data.get('categories', []))} parts found"
            )
            return data

        except httpx.HTTPStatusError as e:
            logger.error(f"[Convex] Parts lookup error {e.response.status_code}: {e.response.text}")
            return {"error": str(e), "categories": []}
        except Exception as e:
            logger.error(f"[Convex] Parts lookup failed: {e}")
            return {"error": str(e), "categories": []}

    async def create_appointment(
        self,
        customer_name: str,
        customer_phone: str,
        vehicle_year: int,
        vehicle_make: str,
        vehicle_model: str,
        service_type: str,
        service_description: str,
        estimated_duration: int,
        scheduled_date: str,
        scheduled_time: str,
        customer_email: str = "",
        parts_needed: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Create an appointment in Convex (for dashboard + records).

        This is called AFTER Cal.com booking is confirmed, so we have a
        matching record in our own database.

        Args:
            customer_name:        Full name
            customer_phone:       Phone number
            vehicle_year:         e.g. 2018
            vehicle_make:         e.g. "Honda"
            vehicle_model:        e.g. "Civic"
            service_type:         e.g. "oil_change"
            service_description:  Human-readable description
            estimated_duration:   Minutes
            scheduled_date:       YYYY-MM-DD
            scheduled_time:       HH:MM (24-hour)
            customer_email:       Optional
            parts_needed:         List of Convex part IDs (optional)
        """
        if not self.enabled:
            return {"error": "Convex not configured"}

        url = f"{self.site_url}/api/appointments/create"
        body: Dict[str, Any] = {
            "customerName": customer_name,
            "customerPhone": customer_phone,
            "vehicleYear": vehicle_year,
            "vehicleMake": vehicle_make,
            "vehicleModel": vehicle_model,
            "serviceType": service_type,
            "serviceDescription": service_description,
            "estimatedDuration": estimated_duration,
            "scheduledDate": scheduled_date,
            "scheduledTime": scheduled_time,
            "partsNeeded": parts_needed or [],
        }
        if customer_email:
            body["customerEmail"] = customer_email

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(url, json=body)
                resp.raise_for_status()

            data = resp.json()
            logger.success(
                f"[Convex] Appointment created: {customer_name} "
                f"on {scheduled_date} at {scheduled_time}"
            )
            return data

        except httpx.HTTPStatusError as e:
            logger.error(f"[Convex] Appointment create error {e.response.status_code}: {e.response.text}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"[Convex] Appointment create failed: {e}")
            return {"error": str(e)}

    async def save_diagnostic_notes(
        self,
        appointment_id: str,
        diagnostic_notes: str,
        reported_symptoms: Optional[List[Dict[str, str]]] = None,
        obd_codes: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Persist diagnostic intake data onto the appointment record."""
        if not self.enabled:
            return {"error": "Convex not configured"}

        url = f"{self.site_url}/api/appointments/diagnostic"
        body: Dict[str, Any] = {
            "appointmentId": appointment_id,
            "diagnosticNotes": diagnostic_notes,
            "reportedSymptoms": reported_symptoms or [],
            "obdCodes": obd_codes or [],
        }

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(url, json=body)
                resp.raise_for_status()
            logger.info(f"[Convex] Diagnostic notes saved for appointment {appointment_id}")
            return resp.json()
        except Exception as e:
            logger.error(f"[Convex] Failed to save diagnostic notes: {e}")
            return {"error": str(e)}

    async def trigger_rockauto_lookup(
        self,
        appointment_id: str,
        year: int,
        make: str,
        model: str,
        service: str,
        engine_size: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Start a background Apify RockAuto scrape for this appointment.

        Builds RockAuto catalog URLs from the vehicle + service, fires an
        Apify actor run, and configures a webhook back to Convex so the
        appointment record auto-updates when scraping completes.

        Args:
            appointment_id: Convex appointment ID (used in webhook URL)
            year:           Vehicle year
            make:           Vehicle make (e.g. "Honda")
            model:          Vehicle model (e.g. "Civic")
            service:        Service code (e.g. "oil_change")
            engine_size:    Optional engine size string (e.g. "2.0 L") for URL precision
        """
        apify_token = os.getenv("APIFY_API_TOKEN", "")
        if not apify_token:
            logger.warning("[Apify] APIFY_API_TOKEN not set — skipping RockAuto lookup")
            return {"skipped": True, "reason": "no api token"}

        site_url = (os.getenv("CONVEX_SITE_URL") or CONVEX_SITE_URL_DEFAULT).rstrip("/")
        webhook_url = f"{site_url}/api/apify/webhook?apptId={appointment_id}"

        # Build RockAuto catalog URLs for each part category this service needs
        paths = ROCKAUTO_PATHS.get(service, ["engine,oilfilter"])
        make_slug = make.lower().replace(" ", "+")
        model_slug = model.lower().replace(" ", "+")

        # Engine size slug: "2.0 L" → "2.0l"
        engine_slug = ""
        if engine_size:
            engine_slug = "," + engine_size.lower().replace(" ", "").replace("l", "l")

        start_urls = []
        for path in paths:
            url = (
                f"https://www.rockauto.com/en/catalog/"
                f"{make_slug},{year},{model_slug}{engine_slug}/{path}"
            )
            start_urls.append({"url": url})

        # Apify webhook config — base64-encoded JSON array
        webhooks_payload = json.dumps([{
            "eventTypes": ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED"],
            "requestUrl": webhook_url,
        }])
        webhooks_b64 = base64.b64encode(webhooks_payload.encode()).decode()

        actor_input = {
            "startUrls": start_urls,
            "maxRequestsPerCrawl": 50,
        }

        run_url = (
            f"https://api.apify.com/v2/acts/{APIFY_ACTOR_ID}/runs"
            f"?token={apify_token}&webhooks={webhooks_b64}"
        )

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(run_url, json=actor_input)
                resp.raise_for_status()

            run_data = resp.json().get("data", {})
            run_id = run_data.get("id", "")

            logger.info(
                f"[Apify] RockAuto run started: {run_id} | "
                f"{year} {make} {model} / {service} | "
                f"{len(start_urls)} URL(s)"
            )
            return {"started": True, "runId": run_id, "urls": [u["url"] for u in start_urls]}

        except httpx.HTTPStatusError as e:
            logger.error(f"[Apify] Run start error {e.response.status_code}: {e.response.text}")
            return {"started": False, "error": str(e)}
        except Exception as e:
            logger.error(f"[Apify] Run start failed: {e}")
            return {"started": False, "error": str(e)}

    async def trigger_reorder(self, appointment_id: str = "") -> Dict[str, Any]:
        """Trigger auto-reorder for any parts below minimum stock.

        Called after a booking so the shop knows what to order before the appointment.
        """
        if not self.enabled:
            return {"error": "Convex not configured"}

        url = f"{self.site_url}/api/orders/trigger"
        body: Dict[str, Any] = {}
        if appointment_id:
            body["appointmentId"] = appointment_id

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(url, json=body)
                resp.raise_for_status()

            data = resp.json()
            orders_created = data.get("ordersCreated", 0)
            if orders_created:
                logger.info(f"[Convex] Auto-reorder triggered: {orders_created} order(s) created")
            return data

        except Exception as e:
            logger.error(f"[Convex] Reorder trigger failed: {e}")
            return {"error": str(e)}
