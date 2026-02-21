"""OBD-II diagnostic trouble code (DTC) lookup table.

Covers the most common P, B, C, and U codes a shop will encounter.
P0xxx/P2xxx are SAE generic standards. P1xxx are manufacturer-specific
but the most common ones are included.

Each entry:
    description  — what the code means
    causes       — ordered most-to-least common
    urgency      — "low" | "medium" | "high" | "critical"
    notes        — what the mechanic should check first
"""

from typing import Dict, Any, Optional

OBD_DATABASE: Dict[str, Dict[str, Any]] = {

    # -----------------------------------------------------------------------
    # P0 — Fuel & Air Metering
    # -----------------------------------------------------------------------
    "P0101": {
        "description": "Mass Air Flow (MAF) Sensor Range/Performance",
        "causes": ["Dirty or faulty MAF sensor", "Air intake leak", "Clogged air filter", "Wiring issue"],
        "urgency": "medium",
        "notes": "Clean MAF sensor first — often resolves it without replacement.",
    },
    "P0102": {
        "description": "Mass Air Flow (MAF) Sensor Circuit Low Input",
        "causes": ["Faulty MAF sensor", "Wiring/connector issue", "Air intake leak"],
        "urgency": "medium",
        "notes": "Check wiring and connector before replacing the sensor.",
    },
    "P0113": {
        "description": "Intake Air Temperature Sensor Circuit High Input",
        "causes": ["Faulty IAT sensor", "Open circuit in wiring", "Poor connector contact"],
        "urgency": "low",
        "notes": "Often bundled with MAF sensor — check if they share a housing.",
    },
    "P0128": {
        "description": "Coolant Temperature Below Thermostat Regulating Temperature",
        "causes": ["Thermostat stuck open", "Faulty coolant temp sensor", "Low coolant"],
        "urgency": "medium",
        "notes": "Thermostat replacement is the fix 90% of the time.",
    },
    "P0171": {
        "description": "System Too Lean (Bank 1)",
        "causes": ["Vacuum leak", "Dirty/faulty MAF sensor", "Weak fuel pump", "Clogged fuel injector", "Faulty O2 sensor"],
        "urgency": "medium",
        "notes": "Start with a smoke test for vacuum leaks. Very common on high-mileage engines.",
    },
    "P0172": {
        "description": "System Too Rich (Bank 1)",
        "causes": ["Faulty O2 sensor", "Leaky fuel injector", "High fuel pressure", "Faulty coolant temp sensor"],
        "urgency": "medium",
        "notes": "Check for fuel smell in oil — can indicate injector leak.",
    },
    "P0174": {
        "description": "System Too Lean (Bank 2)",
        "causes": ["Vacuum leak", "Dirty MAF sensor", "Weak fuel pump", "Clogged injector"],
        "urgency": "medium",
        "notes": "If P0171 and P0174 both present — likely MAF sensor or large vacuum leak.",
    },
    "P0175": {
        "description": "System Too Rich (Bank 2)",
        "causes": ["Faulty O2 sensor (bank 2)", "Leaky injector", "High fuel pressure"],
        "urgency": "medium",
        "notes": "Check fuel trims on both banks to isolate.",
    },

    # -----------------------------------------------------------------------
    # P0 — Ignition System / Misfires
    # -----------------------------------------------------------------------
    "P0300": {
        "description": "Random/Multiple Cylinder Misfire Detected",
        "causes": ["Worn spark plugs", "Faulty ignition coils", "Low fuel pressure", "Vacuum leak", "Low compression", "Faulty injectors"],
        "urgency": "high",
        "notes": "Check spark plugs first — if original and >60k miles, replace all. If plugs are good, do coil-swap test.",
    },
    "P0301": {
        "description": "Cylinder 1 Misfire Detected",
        "causes": ["Worn spark plug (cyl 1)", "Faulty ignition coil (cyl 1)", "Faulty fuel injector (cyl 1)", "Low compression (cyl 1)"],
        "urgency": "high",
        "notes": "Swap coil from cyl 1 to another cylinder — if misfire follows the coil, replace coil.",
    },
    "P0302": {
        "description": "Cylinder 2 Misfire Detected",
        "causes": ["Worn spark plug (cyl 2)", "Faulty ignition coil (cyl 2)", "Faulty injector (cyl 2)"],
        "urgency": "high",
        "notes": "Coil swap test — move cyl 2 coil to see if misfire code follows.",
    },
    "P0303": {
        "description": "Cylinder 3 Misfire Detected",
        "causes": ["Worn spark plug (cyl 3)", "Faulty ignition coil (cyl 3)", "Faulty injector (cyl 3)"],
        "urgency": "high",
        "notes": "Coil swap test first.",
    },
    "P0304": {
        "description": "Cylinder 4 Misfire Detected",
        "causes": ["Worn spark plug (cyl 4)", "Faulty ignition coil (cyl 4)", "Faulty injector (cyl 4)"],
        "urgency": "high",
        "notes": "Coil swap test first.",
    },
    "P0305": {
        "description": "Cylinder 5 Misfire Detected",
        "causes": ["Worn spark plug (cyl 5)", "Faulty ignition coil (cyl 5)", "Faulty injector (cyl 5)"],
        "urgency": "high",
        "notes": "Coil swap test first.",
    },
    "P0306": {
        "description": "Cylinder 6 Misfire Detected",
        "causes": ["Worn spark plug (cyl 6)", "Faulty ignition coil (cyl 6)", "Faulty injector (cyl 6)"],
        "urgency": "high",
        "notes": "Coil swap test first.",
    },

    # -----------------------------------------------------------------------
    # P0 — Catalytic Converter / Oxygen Sensors
    # -----------------------------------------------------------------------
    "P0420": {
        "description": "Catalyst System Efficiency Below Threshold (Bank 1)",
        "causes": ["Worn catalytic converter", "Faulty downstream O2 sensor", "Exhaust leak before cat", "Rich running condition damaging cat"],
        "urgency": "medium",
        "notes": "Verify no exhaust leaks and engine is running properly before replacing cat — a rich condition will destroy a new one.",
    },
    "P0430": {
        "description": "Catalyst System Efficiency Below Threshold (Bank 2)",
        "causes": ["Worn catalytic converter (bank 2)", "Faulty downstream O2 sensor", "Exhaust leak"],
        "urgency": "medium",
        "notes": "Same as P0420 — check O2 sensor and exhaust leaks first.",
    },
    "P0131": {
        "description": "O2 Sensor Circuit Low Voltage (Bank 1, Sensor 1)",
        "causes": ["Faulty upstream O2 sensor", "Exhaust leak near sensor", "Wiring issue"],
        "urgency": "medium",
        "notes": "Check for exhaust leaks before replacing sensor.",
    },
    "P0141": {
        "description": "O2 Sensor Heater Circuit Malfunction (Bank 1, Sensor 2)",
        "causes": ["Faulty downstream O2 sensor heater", "Blown fuse", "Wiring short"],
        "urgency": "low",
        "notes": "Check fuse first. Downstream O2 heater failure is common on high-mileage vehicles.",
    },

    # -----------------------------------------------------------------------
    # P0 — Transmission
    # -----------------------------------------------------------------------
    "P0700": {
        "description": "Transmission Control System Malfunction",
        "causes": ["TCM fault", "Solenoid issue", "Wiring problem", "Low transmission fluid"],
        "urgency": "high",
        "notes": "Check fluid level and condition first. Scan for additional transmission codes.",
    },
    "P0715": {
        "description": "Input/Turbine Speed Sensor Circuit Malfunction",
        "causes": ["Faulty input speed sensor", "Wiring issue", "Worn sensor reluctor ring"],
        "urgency": "high",
        "notes": "Transmission will likely have erratic shifting. Check fluid condition.",
    },
    "P0720": {
        "description": "Output Speed Sensor Circuit Malfunction",
        "causes": ["Faulty output speed sensor", "Wiring issue"],
        "urgency": "high",
        "notes": "Speedometer may be erratic. Transmission may not shift properly.",
    },
    "P0730": {
        "description": "Incorrect Gear Ratio",
        "causes": ["Low/dirty transmission fluid", "Worn clutch packs", "Faulty solenoid", "TCM issue"],
        "urgency": "high",
        "notes": "Check fluid level and condition immediately. May indicate internal transmission wear.",
    },

    # -----------------------------------------------------------------------
    # P0 — EGR / EVAP / Emissions
    # -----------------------------------------------------------------------
    "P0401": {
        "description": "Exhaust Gas Recirculation (EGR) Flow Insufficient Detected",
        "causes": ["Clogged EGR valve", "Faulty EGR valve", "Clogged EGR passages", "Faulty EGR position sensor"],
        "urgency": "medium",
        "notes": "Clean EGR valve and passages first — often resolves without replacement.",
    },
    "P0440": {
        "description": "Evaporative Emission Control System Malfunction",
        "causes": ["Loose or faulty gas cap", "Cracked EVAP hose", "Faulty purge valve", "Faulty vent valve"],
        "urgency": "low",
        "notes": "Check gas cap first — retighten or replace. Very common cause.",
    },
    "P0441": {
        "description": "EVAP System Incorrect Purge Flow",
        "causes": ["Faulty purge solenoid", "Cracked EVAP hose", "Faulty gas cap"],
        "urgency": "low",
        "notes": "Smoke test the EVAP system to find leaks.",
    },
    "P0455": {
        "description": "EVAP System Large Leak Detected",
        "causes": ["Loose/missing gas cap", "Cracked fuel tank", "Damaged EVAP hose", "Faulty vent valve"],
        "urgency": "low",
        "notes": "Start with gas cap. If that's not it, smoke test the EVAP system.",
    },
    "P0456": {
        "description": "EVAP System Small Leak Detected",
        "causes": ["Loose gas cap", "Micro-crack in EVAP hose", "Faulty purge valve sealing"],
        "urgency": "low",
        "notes": "Smoke test needed — small leaks are hard to find without it.",
    },

    # -----------------------------------------------------------------------
    # P0 — Engine Cooling / Oil
    # -----------------------------------------------------------------------
    "P0217": {
        "description": "Engine Coolant Over Temperature Condition",
        "causes": ["Low coolant", "Faulty thermostat", "Failed water pump", "Clogged radiator", "Blown head gasket"],
        "urgency": "critical",
        "notes": "Do NOT drive — overheating can cause catastrophic engine damage. Check coolant level immediately.",
    },
    "P0520": {
        "description": "Engine Oil Pressure Sensor/Switch Circuit Malfunction",
        "causes": ["Faulty oil pressure sensor", "Low oil level", "Wiring issue", "Actual low oil pressure"],
        "urgency": "critical",
        "notes": "Check oil level first. If oil is full and light is still on, do not run engine until pressure is verified.",
    },

    # -----------------------------------------------------------------------
    # P0 — VVT / VANOS / Variable Valve Timing
    # -----------------------------------------------------------------------
    "P0011": {
        "description": "Camshaft Position A - Timing Over-Advanced (Bank 1)",
        "causes": ["Low oil level/pressure", "Clogged oil passages to VVT actuator", "Faulty VVT solenoid", "Stretched timing chain"],
        "urgency": "high",
        "notes": "Check oil level and condition first. Dirty oil is the leading cause of VVT codes.",
    },
    "P0012": {
        "description": "Camshaft Position A - Timing Over-Retarded (Bank 1)",
        "causes": ["Faulty VVT solenoid", "Low oil pressure", "Clogged actuator", "Stretched timing chain"],
        "urgency": "high",
        "notes": "Same root causes as P0011 — oil quality/level is key.",
    },
    "P0021": {
        "description": "Camshaft Position A - Timing Over-Advanced (Bank 2)",
        "causes": ["Low oil level/pressure", "Faulty VVT solenoid (bank 2)", "Clogged oil passages"],
        "urgency": "high",
        "notes": "Change oil if overdue — dirty oil causes VVT actuator sticking.",
    },

    # -----------------------------------------------------------------------
    # P0 — Throttle / Pedal
    # -----------------------------------------------------------------------
    "P0121": {
        "description": "Throttle/Pedal Position Sensor Range/Performance",
        "causes": ["Faulty TPS", "Dirty throttle body", "Wiring issue"],
        "urgency": "medium",
        "notes": "Clean throttle body first. Idle relearn may be needed after cleaning.",
    },
    "P0507": {
        "description": "Idle Air Control System RPM High",
        "causes": ["Dirty throttle body", "Vacuum leak", "Faulty IAC valve", "Carbon buildup"],
        "urgency": "medium",
        "notes": "Throttle body cleaning is usually the fix.",
    },

    # -----------------------------------------------------------------------
    # P2 — Generic (newer SAE codes)
    # -----------------------------------------------------------------------
    "P2096": {
        "description": "Post Catalyst Fuel Trim System Too Lean (Bank 1)",
        "causes": ["Exhaust leak after cat", "Faulty downstream O2 sensor", "Failing catalytic converter"],
        "urgency": "medium",
        "notes": "Check for exhaust leaks with a stethoscope.",
    },
    "P2187": {
        "description": "System Too Lean at Idle (Bank 1)",
        "causes": ["Vacuum leak", "Dirty MAF sensor", "Low fuel pressure"],
        "urgency": "medium",
        "notes": "Smoke test for vacuum leaks. Common on turbocharged engines.",
    },
    "P2270": {
        "description": "O2 Sensor Signal Stuck Lean (Bank 1, Sensor 2)",
        "causes": ["Faulty downstream O2 sensor", "Exhaust leak", "Wiring issue"],
        "urgency": "medium",
        "notes": "Downstream O2 sensor replacement usually resolves this.",
    },

    # -----------------------------------------------------------------------
    # B — Body Codes
    # -----------------------------------------------------------------------
    "B0001": {
        "description": "Driver Frontal Stage 1 Deployment Control",
        "causes": ["Airbag system fault", "Clock spring failure", "Wiring issue"],
        "urgency": "high",
        "notes": "Airbag system — do not attempt diagnosis without proper equipment.",
    },
    "B1000": {
        "description": "ECU Malfunction (Body Control Module)",
        "causes": ["BCM fault", "Power supply issue", "Software fault"],
        "urgency": "medium",
        "notes": "Check for updated BCM software/calibration files.",
    },

    # -----------------------------------------------------------------------
    # C — Chassis Codes
    # -----------------------------------------------------------------------
    "C0031": {
        "description": "Right Front Wheel Speed Sensor Circuit",
        "causes": ["Faulty wheel speed sensor", "Damaged reluctor ring", "Wiring damage", "Wheel bearing failure"],
        "urgency": "high",
        "notes": "ABS/traction control will be disabled. Check sensor and reluctor ring for damage.",
    },
    "C0035": {
        "description": "Left Front Wheel Speed Sensor Circuit",
        "causes": ["Faulty wheel speed sensor", "Damaged reluctor ring", "Wiring damage", "Wheel bearing failure"],
        "urgency": "high",
        "notes": "ABS/traction control will be disabled.",
    },
    "C0040": {
        "description": "Right Rear Wheel Speed Sensor Circuit",
        "causes": ["Faulty wheel speed sensor", "Damaged reluctor ring", "Wiring damage"],
        "urgency": "high",
        "notes": "ABS/traction control will be disabled.",
    },
    "C0561": {
        "description": "ABS System Disabled",
        "causes": ["Multiple wheel speed sensor faults", "ABS module failure", "Low brake fluid"],
        "urgency": "high",
        "notes": "Check all wheel speed sensors. ABS is non-functional until resolved.",
    },

    # -----------------------------------------------------------------------
    # U — Network / Communication Codes
    # -----------------------------------------------------------------------
    "U0100": {
        "description": "Lost Communication with ECM/PCM",
        "causes": ["Wiring fault on CAN bus", "Faulty PCM", "Poor ground connection", "Power supply issue"],
        "urgency": "high",
        "notes": "Check CAN bus wiring and grounds before condemning the PCM.",
    },
    "U0101": {
        "description": "Lost Communication with TCM",
        "causes": ["CAN bus wiring fault", "Faulty TCM", "Power/ground issue"],
        "urgency": "high",
        "notes": "Transmission will likely be in failsafe mode.",
    },
    "U0121": {
        "description": "Lost Communication with Anti-Lock Brake System (ABS) Control Module",
        "causes": ["Wiring fault", "Faulty ABS module", "CAN bus issue"],
        "urgency": "high",
        "notes": "ABS and traction control will be inoperative.",
    },
    "U0155": {
        "description": "Lost Communication with Instrument Panel Cluster",
        "causes": ["Cluster module failure", "CAN bus wiring fault", "Blown fuse"],
        "urgency": "medium",
        "notes": "Check cluster fuses and CAN bus connections.",
    },
}

# -----------------------------------------------------------------------
# Code prefix descriptions for unknown codes
# -----------------------------------------------------------------------
_PREFIX_DESCRIPTIONS: Dict[str, str] = {
    "P0": "Generic Powertrain",
    "P1": "Manufacturer-Specific Powertrain",
    "P2": "Generic Powertrain (secondary)",
    "P3": "Manufacturer-Specific Powertrain",
    "B0": "Generic Body",
    "B1": "Manufacturer-Specific Body",
    "C0": "Generic Chassis",
    "C1": "Manufacturer-Specific Chassis",
    "U0": "Generic Network Communication",
    "U1": "Manufacturer-Specific Network",
}

_URGENCY_BY_PREFIX: Dict[str, str] = {
    "P0": "medium",
    "P1": "medium",
    "P2": "medium",
    "B0": "medium",
    "B1": "medium",
    "C0": "high",
    "C1": "high",
    "U0": "high",
    "U1": "medium",
}


def lookup_obd_code(code: str) -> Dict[str, Any]:
    """Look up an OBD-II diagnostic trouble code.

    Returns description, common causes, urgency, and mechanic notes.
    Falls back to a prefix-based generic description for unknown codes.

    Args:
        code: DTC code string, e.g. "P0301", "p0301", "P 0301"
    """
    # Normalize: uppercase, remove spaces and dashes
    normalized = code.upper().replace(" ", "").replace("-", "").strip()

    # Known code
    if normalized in OBD_DATABASE:
        entry = OBD_DATABASE[normalized]
        return {
            "code": normalized,
            "found": True,
            "description": entry["description"],
            "causes": entry["causes"],
            "urgency": entry["urgency"],
            "notes": entry["notes"],
        }

    # Unknown code — use prefix to give a generic category
    prefix = normalized[:2] if len(normalized) >= 2 else normalized
    category = _PREFIX_DESCRIPTIONS.get(prefix, "Unknown system")
    urgency = _URGENCY_BY_PREFIX.get(prefix, "medium")

    return {
        "code": normalized,
        "found": False,
        "description": f"{category} fault — code {normalized} not in database",
        "causes": ["Unknown — requires live scan data to diagnose"],
        "urgency": urgency,
        "notes": "Pull live data and freeze frame with scan tool to determine root cause.",
    }
