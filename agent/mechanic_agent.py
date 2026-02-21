"""Auto Shop Voice Agent — answers customer calls, identifies parts,
checks inventory, books appointments, and auto-orders missing parts.

Adapted from the smallest.ai appointment scheduler cookbook.
"""

import json
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List

import dateparser
from dotenv import load_dotenv
from loguru import logger

from smallestai.atoms.agent.clients.openai import OpenAIClient
from smallestai.atoms.agent.clients.types import ToolCall, ToolResult
from smallestai.atoms.agent.events import SDKAgentEndCallEvent
from smallestai.atoms.agent.nodes import OutputAgentNode
from smallestai.atoms.agent.tools import ToolRegistry, function_tool

from calcom_client import CalcomClient
from carsxe_client import CarsXEClient
from convex_client import ConvexClient
from obd_codes import lookup_obd_code

load_dotenv()

# ---------------------------------------------------------------------------
# Date resolution (identical to cookbook)
# ---------------------------------------------------------------------------

WEEKDAYS = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
    "mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6,
}


def resolve_date_reference(ref: str) -> str:
    """Resolve any date reference to YYYY-MM-DD."""
    ref_lower = ref.strip().lower()
    today = datetime.now().date()

    if len(ref_lower) == 10 and ref_lower[4] == "-" and ref_lower[7] == "-":
        return ref_lower
    if ref_lower == "today":
        return today.strftime("%Y-%m-%d")
    if ref_lower == "tomorrow":
        return (today + timedelta(days=1)).strftime("%Y-%m-%d")

    clean = ref_lower.replace("next ", "")
    if clean in WEEKDAYS:
        target_day = WEEKDAYS[clean]
        days_ahead = target_day - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    parsed = dateparser.parse(
        ref,
        settings={"PREFER_DATES_FROM": "current_period", "RELATIVE_BASE": datetime.now()},
    )
    if parsed:
        result_date = parsed.date()
        if result_date < today:
            result_date = result_date.replace(year=result_date.year + 1)
        return result_date.strftime("%Y-%m-%d")

    logger.warning(f"[resolve_date] Could not parse '{ref}', defaulting to today")
    return today.strftime("%Y-%m-%d")


# ---------------------------------------------------------------------------
# Service → duration mapping (minutes)
# ---------------------------------------------------------------------------

SERVICE_DURATION: Dict[str, int] = {
    "oil_change": 30,
    "brake_service": 90,
    "tire_rotation": 30,
    "tire_replacement": 60,
    "brake_pad_replacement": 60,
    "muffler": 90,
    "transmission": 120,
    "general_inspection": 45,
    "other": 60,
}

SERVICE_LABELS: Dict[str, str] = {
    "oil_change": "Oil Change",
    "brake_service": "Brake Service",
    "tire_rotation": "Tire Rotation",
    "tire_replacement": "Tire Replacement",
    "brake_pad_replacement": "Brake Pad Replacement",
    "muffler": "Muffler Repair",
    "transmission": "Transmission Service",
    "general_inspection": "General Inspection",
    "other": "General Service",
}


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

def build_system_prompt() -> str:
    today = datetime.now()
    today_str = today.strftime("%A, %B %d, %Y")

    return f"""You are **Alex**, a friendly and efficient service advisor at **Precision Auto Shop**.

Today is **{today_str}**.

## Your Role
Help customers schedule service appointments over the phone.
You gather vehicle information, identify exactly what parts are needed,
check inventory, and book the appointment — all in one call.

## Voice & Style
- Warm but efficient — customers calling a shop want quick answers
- Keep responses short: 1–3 sentences. This is a phone call.
- Use plain language. Say "oil change" not "lubrication service interval."
- Confirm key details before booking: vehicle, service, date, time, name, phone

## Conversation Flow

### Step 1 — Returning customer check
After the greeting, always ask: "Have you had service done with us before?"

**If YES:**
- Ask for their phone number
- Call `lookup_customer` with their phone number
- **If found:** Greet them by name and confirm their vehicle on file.
  Say: "Welcome back, [name]! I see your last visit was [date] for [service] on your [year make model]. Are you calling about the same vehicle today?"
  - If same vehicle: skip vehicle questions, go straight to Step 3
  - If different vehicle: ask for the new vehicle details, then go to Step 3
- **If not found:** Say "I don't see a record under that number — no problem, let me get your info."
  Continue as a new customer below.

**If NO (new customer):**
- Proceed to Step 2

### Step 2 — Vehicle info (new customers or changed vehicle)
Ask as one question: "What year, make, and model is your vehicle?"
Then immediately call `get_vehicle_specs` to look up the engine configuration.
- If the vehicle is electric/plugin-electric: skip any oil or filter questions
- If specs are found: mention the engine briefly only if relevant ("Got it, the 1.5L turbo uses 0W-20 oil")
- Optionally: if the customer mentions they have their VIN handy, call `get_vehicle_specs` with the VIN instead for maximum precision

### Step 3 — Service needed
Ask what service they need today.
Use the specs from `get_vehicle_specs` to be specific:
- For oil changes: you already know the viscosity and capacity, no need to ask
- For EVs: skip oil change and filter questions entirely; offer battery/brake/tire service
- If they describe a **problem** (not a routine service), run the diagnostic intake below

### Step 3b — Diagnostic intake (for non-routine issues)
When a customer describes a problem — noise, warning light, rough running, won't start, etc. —
run through these questions one at a time (not all at once):

1. "Where is it coming from — under the hood, underneath the car, when braking, or hard to tell?"
2. "Does it happen all the time, or only in certain conditions — like cold starts, highway speed, or when you accelerate?"
3. "How long has it been doing this, and would you say it's getting worse?"
4. "Any warning lights on the dashboard?"
5. **"Do you have a code reader, or has anyone scanned the car recently?"**
   - **YES + they have a code**: "What's the code showing?" → call `decode_obd_code` with each code they give you
   - **YES + they don't remember the code**: "No problem — we'll pull it when you come in."
   - **NO**: "No worries, we'll scan it when you arrive."

After gathering symptoms, call `record_symptom` for each distinct symptom.
Then proceed to scheduling normally.

### Step 4 — Parts lookup
Use `lookup_parts` with the vehicle and service.
If parts are low/out: "I'll make sure we have that ordered before your visit."

### Step 5 — Scheduling
Ask for preferred date and time.
Use `resolve_date` then `check_slot` to verify.
If busy, offer the alternatives returned by the tool.

### Step 6 — Confirm and book
For returning customers you already have their name and phone — confirm them.
For new customers, ask for name and phone number.

Call in this exact order:
1. `book_appointment` — creates the Cal.com calendar event
2. `save_appointment` — records it in the shop database
3. `save_diagnostic_intake` — if this was a diagnostic call (symptoms or OBD codes were recorded)
4. `enrich_parts_from_rockauto` — fires silently in the background
5. `trigger_parts_order` — if any parts were flagged as low stock

Read back the confirmation after step 2. Steps 3–5 run silently.

## Tool Usage Rules
- **ALWAYS ask the returning-customer question first**, before asking about vehicle or service
- **ALWAYS call `get_vehicle_specs`** as soon as you have year/make/model (or a VIN)
- **ALWAYS call `resolve_date` first** before `check_slot` or `get_available_slots`
- **ALWAYS call `lookup_parts`** once you have year/make/model/service — never guess
- **NEVER invent availability** — always call `check_slot`
- **NEVER ask what oil type a car needs** — `get_vehicle_specs` tells you
- **For diagnostic calls**: ask the code reader question every time — even if they seem unsure
- **ALWAYS call `save_diagnostic_intake`** before `book_appointment` on any diagnostic call
- When a slot is busy: "10am is taken, but I have 11:30 or 2pm open — which works?"
- Read times in 12-hour format: "10:00 AM", "2:30 PM"
- After booking: "You're all set! Wednesday February 25th at 10:00 AM for an oil change on your 2018 Honda Civic."

## Service Codes (use these exactly with `lookup_parts`)
- oil_change, brake_service, tire_rotation, tire_replacement
- brake_pad_replacement, muffler, transmission, general_inspection, other

## Common Vehicle Notes
- Honda Civic (2016–2022): needs 0W-20 synthetic oil + Honda filter
- Toyota Camry (2018–2022): needs 0W-16 synthetic oil
- Most SUVs (2015–2022): 225/60R17 all-season tires
"""


# ---------------------------------------------------------------------------
# MechanicAgent
# ---------------------------------------------------------------------------

class MechanicAgent(OutputAgentNode):
    """Auto shop voice agent."""

    def __init__(self, calcom: CalcomClient, convex: ConvexClient, carsxe: CarsXEClient):
        super().__init__(name="mechanic-agent")

        self.calcom = calcom
        self.convex = convex
        self.carsxe = carsxe

        self.llm = OpenAIClient(
            model="gpt-4o-mini",
            temperature=0.6,
            api_key=os.getenv("OPENAI_API_KEY"),
        )

        self.tool_registry = ToolRegistry()
        self.tool_registry.discover(self)
        self.tool_schemas = self.tool_registry.get_schemas()

        self.context.add_message({"role": "system", "content": build_system_prompt()})

        # Track vehicle/appointment state for save_appointment
        self._vehicle: Dict[str, Any] = {}
        self._vehicle_specs: Dict[str, Any] = {}
        self._service: Dict[str, Any] = {}
        self._customer: Dict[str, Any] = {}
        self._booked_slot: Dict[str, Any] = {}
        self._convex_appointment_id: str = ""

        # Diagnostic intake state
        self._reported_symptoms: List[Dict[str, str]] = []
        self._obd_codes: List[Dict[str, Any]] = []
        self._is_diagnostic_call: bool = False

    # ------------------------------------------------------------------
    # Response loop (identical pattern to cookbook)
    # ------------------------------------------------------------------

    async def generate_response(self):
        MAX_ROUNDS = 6

        for round_num in range(MAX_ROUNDS):
            response = await self.llm.chat(
                messages=self.context.messages,
                stream=True,
                tools=self.tool_schemas,
            )

            tool_calls: List[ToolCall] = []
            full_response = ""

            async for chunk in response:
                if chunk.content:
                    full_response += chunk.content
                    yield chunk.content
                if chunk.tool_calls:
                    tool_calls.extend(chunk.tool_calls)

            if not tool_calls:
                if full_response:
                    self.context.add_message({"role": "assistant", "content": full_response})
                return

            results: List[ToolResult] = await self.tool_registry.execute(
                tool_calls=tool_calls, parallel=True
            )

            for tc, result in zip(tool_calls, results):
                logger.info(f"[MechanicAgent] Tool: {tc.name} → {str(result.content)[:120]}")

            self.context.add_messages([
                {
                    "role": "assistant",
                    "content": full_response or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.name,
                                "arguments": (
                                    json.dumps(tc.arguments)
                                    if isinstance(tc.arguments, dict)
                                    else str(tc.arguments)
                                ),
                            },
                        }
                        for tc in tool_calls
                    ],
                },
                *[
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": "" if result.content is None else str(result.content),
                    }
                    for tc, result in zip(tool_calls, results)
                ],
            ])

        # Max rounds hit — wrap up
        final = await self.llm.chat(messages=self.context.messages, stream=True)
        final_text = ""
        async for chunk in final:
            if chunk.content:
                final_text += chunk.content
                yield chunk.content
        if final_text:
            self.context.add_message({"role": "assistant", "content": final_text})

    # ------------------------------------------------------------------
    # Tools
    # ------------------------------------------------------------------

    @function_tool()
    async def lookup_customer(self, phone: str) -> str:
        """Look up a returning customer by phone number in the shop's CRM.

        Call this when a customer says they've been here before and provides
        their phone number. Returns their name, last vehicle, and service history.
        If found, their vehicle data is automatically loaded — skip vehicle questions.

        Args:
            phone: Customer's phone number (any format — digits are extracted automatically)
        """
        result = await self.convex.lookup_customer(phone)

        if result.get("found"):
            # Pre-populate customer and vehicle state from CRM
            self._customer = {
                "name": result.get("customerName", ""),
                "phone": phone,
            }
            last_vehicle = result.get("lastVehicle", {})
            if last_vehicle:
                self._vehicle = {
                    "year": last_vehicle.get("year", 0),
                    "make": last_vehicle.get("make", ""),
                    "model": last_vehicle.get("model", ""),
                }
                # Pre-fetch specs silently so they're ready when needed
                specs = await self.carsxe.get_specs_by_ymm(
                    last_vehicle.get("year", 0),
                    last_vehicle.get("make", ""),
                    last_vehicle.get("model", ""),
                )
                if specs.get("found"):
                    self._vehicle_specs = specs

        return json.dumps(result, default=str)

    @function_tool()
    def resolve_date(self, date_reference: str) -> str:
        """Resolve a relative or partial date reference to YYYY-MM-DD.

        Use this for ANY date the customer mentions: 'tomorrow', 'Tuesday',
        'next Friday', 'March 4th', etc. Never construct a date yourself.

        Args:
            date_reference: e.g. 'tuesday', 'tomorrow', 'next friday', 'march 4th'
        """
        resolved = resolve_date_reference(date_reference)
        date_obj = datetime.strptime(resolved, "%Y-%m-%d")
        return json.dumps({"date": resolved, "display": date_obj.strftime("%A, %B %d")})

    @function_tool()
    async def get_vehicle_specs(
        self, year: int, make: str, model: str, vin: str = "", trim: str = ""
    ) -> str:
        """Look up detailed vehicle specs from CarsXE (engine size, oil type, EV status).

        Call this as soon as you have year/make/model — before asking about service.
        It tells you exactly what oil viscosity the car needs, whether it's electric
        (skip oil service), and the full engine configuration.

        Provide vin if the customer has it — gives more precise trim-level data.

        Args:
            year:  Vehicle year (e.g. 2018)
            make:  Vehicle make (e.g. "Honda")
            model: Vehicle model (e.g. "Civic")
            vin:   Optional 17-character VIN for maximum precision
            trim:  Optional trim level (e.g. "Sport", "EX-L")
        """
        if vin:
            result = await self.carsxe.get_specs_by_vin(vin)
            # Fill in year/make/model from VIN decode if not already set
            if result.get("found") and result.get("vehicle"):
                v = result["vehicle"]
                self._vehicle = {
                    "year": v.get("year") or year,
                    "make": v.get("make") or make,
                    "model": v.get("model") or model,
                }
        else:
            result = await self.carsxe.get_specs_by_ymm(year, make, model, trim)
            if result.get("found"):
                self._vehicle = {"year": year, "make": make, "model": model}

        if result.get("found"):
            self._vehicle_specs = result

        return json.dumps(result, default=str)

    @function_tool()
    async def lookup_parts(self, year: int, make: str, model: str, service: str) -> str:
        """Look up parts needed for a vehicle and service, with inventory status.

        Call this as soon as you have year/make/model/service.
        Returns what parts are needed and whether they're in stock.

        Args:
            year:    Vehicle year as integer (e.g. 2018)
            make:    Vehicle make (e.g. "Honda")
            model:   Vehicle model (e.g. "Civic")
            service: Service code — one of: oil_change, brake_service,
                     tire_rotation, tire_replacement, brake_pad_replacement,
                     muffler, transmission, general_inspection, other
        """
        # Stash vehicle info for later use in save_appointment
        self._vehicle = {"year": year, "make": make, "model": model}
        self._service = {
            "type": service,
            "label": SERVICE_LABELS.get(service, "General Service"),
            "duration": SERVICE_DURATION.get(service, 60),
        }

        result = await self.convex.lookup_parts(year, make, model, service)
        return json.dumps(result, default=str)

    @function_tool()
    async def check_slot(self, date: str, time: str) -> str:
        """Check if a specific time slot is available on the shop calendar.

        If busy, returns the 3 nearest available alternatives.

        Args:
            date: Date in YYYY-MM-DD format (use resolve_date first)
            time: Time in HH:MM 24-hour format (e.g. '10:00' for 10am, '14:30' for 2:30pm)
        """
        result = await self.calcom.check_slot(date, time)
        return json.dumps(result, default=str)

    @function_tool()
    async def get_available_slots(self, date: str, count: int = 5) -> str:
        """Get a list of available appointment slots for a given date.

        Use this when the customer hasn't specified a time yet.

        Args:
            date:  Date in YYYY-MM-DD format (use resolve_date first)
            count: Number of slots to return (default 5)
        """
        result = await self.calcom.get_available_slots(date, count)
        return json.dumps(result, default=str)

    @function_tool()
    async def book_appointment(
        self,
        customer_name: str,
        customer_phone: str,
        date: str,
        time: str,
        service_description: str,
    ) -> str:
        """Book the appointment on the Cal.com calendar.

        Only call this after:
        1. You have confirmed year/make/model/service with the customer
        2. You have run lookup_parts
        3. You have verified slot availability with check_slot
        4. You have the customer's name and phone number

        Args:
            customer_name:        Customer's full name
            customer_phone:       Customer's phone number
            date:                 YYYY-MM-DD
            time:                 HH:MM 24-hour
            service_description:  e.g. "Oil change for 2018 Honda Civic"
        """
        # Stash customer + slot info for save_appointment
        self._customer = {"name": customer_name, "phone": customer_phone}
        self._booked_slot = {"date": date, "time": time}

        result = await self.calcom.create_booking(
            date=date,
            time=time,
            attendee_name=customer_name,
            reason=service_description,
        )
        return json.dumps(result, default=str)

    @function_tool()
    async def save_appointment(self) -> str:
        """Save the appointment to the shop's own database (Convex).

        Call this immediately after a successful book_appointment.
        Uses the vehicle, service, customer, and slot info already gathered.
        No arguments needed — it uses what you've already collected.
        """
        if not (self._vehicle and self._customer and self._booked_slot):
            return json.dumps({"error": "Missing vehicle, customer, or slot info"})

        result = await self.convex.create_appointment(
            customer_name=self._customer.get("name", ""),
            customer_phone=self._customer.get("phone", ""),
            vehicle_year=self._vehicle.get("year", 0),
            vehicle_make=self._vehicle.get("make", ""),
            vehicle_model=self._vehicle.get("model", ""),
            service_type=self._service.get("type", "other"),
            service_description=self._service.get("label", "General Service"),
            estimated_duration=self._service.get("duration", 60),
            scheduled_date=self._booked_slot.get("date", ""),
            scheduled_time=self._booked_slot.get("time", ""),
        )

        if result.get("appointmentId"):
            self._convex_appointment_id = result["appointmentId"]

        return json.dumps(result, default=str)

    @function_tool()
    def record_symptom(self, symptom: str, detail: str) -> str:
        """Record a symptom the customer describes during diagnostic intake.

        Call once per distinct symptom. The mechanic will see all recorded
        symptoms on the appointment card before the vehicle arrives.

        Args:
            symptom: Short symptom label, e.g. "knocking noise", "rough idle",
                     "check engine light", "won't start", "vibration at highway speed"
            detail:  What the customer said about it, e.g. "happens on cold start,
                     goes away after 5 minutes, started 2 weeks ago"
        """
        self._is_diagnostic_call = True
        self._reported_symptoms.append({"symptom": symptom, "detail": detail})
        return json.dumps({"recorded": True, "symptom": symptom, "total": len(self._reported_symptoms)})

    @function_tool()
    def decode_obd_code(self, code: str) -> str:
        """Look up an OBD-II diagnostic trouble code the customer has read from their car.

        Returns the description, most likely causes in order, urgency level,
        and what the mechanic should check first.

        Call this for every code the customer mentions.

        Args:
            code: The DTC code, e.g. "P0301", "P0420", "C0035"
        """
        result = lookup_obd_code(code)
        self._is_diagnostic_call = True

        if result["found"]:
            # Store the decoded code for save_diagnostic_intake
            self._obd_codes.append({
                "code": result["code"],
                "description": result["description"],
                "urgency": result["urgency"],
                "causes": result["causes"],
                "notes": result["notes"],
            })

        return json.dumps(result, default=str)

    @function_tool()
    async def save_diagnostic_intake(self) -> str:
        """Persist all recorded symptoms and OBD codes onto the appointment record.

        Call this after gathering all diagnostic information and before
        book_appointment. Uses the symptoms and codes already recorded
        via record_symptom and decode_obd_code.
        No arguments needed.
        """
        if not self._convex_appointment_id:
            # Stash for after appointment is created — will be called again
            return json.dumps({"deferred": True, "reason": "appointment not created yet"})

        notes_lines = []
        if self._reported_symptoms:
            notes_lines.append("Reported symptoms:")
            for s in self._reported_symptoms:
                notes_lines.append(f"  • {s['symptom']}: {s['detail']}")
        if self._obd_codes:
            notes_lines.append("\nOBD codes (customer self-reported):")
            for c in self._obd_codes:
                notes_lines.append(f"  • {c['code']} — {c['description']}")
                notes_lines.append(f"    Likely causes: {', '.join(c['causes'][:3])}")

        notes = "\n".join(notes_lines) if notes_lines else "No symptoms recorded"

        result = await self.convex.save_diagnostic_notes(
            appointment_id=self._convex_appointment_id,
            diagnostic_notes=notes,
            reported_symptoms=self._reported_symptoms,
            obd_codes=self._obd_codes,
        )
        return json.dumps(result, default=str)

    @function_tool()
    async def enrich_parts_from_rockauto(self) -> str:
        """Start a background RockAuto parts lookup for this appointment.

        Call this immediately after save_appointment succeeds.
        It fires silently in the background — the customer doesn't wait.
        The shop dashboard will update automatically with real prices and
        buy links within ~60 seconds.

        No arguments needed — uses vehicle, service, and appointment data
        already gathered during the call.
        """
        if not self._convex_appointment_id:
            return json.dumps({"skipped": True, "reason": "no appointment ID yet"})

        engine_size = (
            self._vehicle_specs.get("engine", {}).get("size_display", "")
            if self._vehicle_specs else ""
        )

        result = await self.convex.trigger_rockauto_lookup(
            appointment_id=self._convex_appointment_id,
            year=self._vehicle.get("year", 0),
            make=self._vehicle.get("make", ""),
            model=self._vehicle.get("model", ""),
            service=self._service.get("type", "other"),
            engine_size=engine_size,
        )
        return json.dumps(result, default=str)

    @function_tool()
    async def trigger_parts_order(self) -> str:
        """Trigger automatic reorder for any parts that are low on stock.

        Call this after save_appointment when lookup_parts showed any parts
        as needsOrder=true. This alerts the shop to order parts before the visit.
        No arguments needed.
        """
        result = await self.convex.trigger_reorder(
            appointment_id=self._convex_appointment_id
        )
        return json.dumps(result, default=str)

    @function_tool()
    async def find_appointment(self, date: str = "", customer_name: str = "") -> str:
        """Look up an existing appointment by date and/or customer name.

        Use when a customer calls to check or reschedule an existing appointment.

        Args:
            date:          YYYY-MM-DD (optional)
            customer_name: Customer name to search for (optional)
        """
        result = await self.calcom.get_bookings(date=date, attendee_name=customer_name)
        return json.dumps(result, default=str)

    @function_tool()
    async def end_call(self) -> None:
        """End the call when the customer says goodbye or is done."""
        await self.send_event(SDKAgentEndCallEvent())
        return None
