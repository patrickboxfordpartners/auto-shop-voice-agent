"""CarsXE API client — fetches vehicle specs to drive precise parts matching.

Provides engine size, cylinders, fuel type, drivetrain, and EV status
from year/make/model or VIN. This is the "what does this car need" layer
before the inventory check.

Env vars:
    CARSXE_API_KEY — your CarsXE API key
"""

import os
import re
from typing import Any, Dict, List, Optional

import httpx
from loguru import logger

CARSXE_BASE = "https://api.carsxe.com"

# ---------------------------------------------------------------------------
# Oil viscosity + capacity lookup
# Keyed by (make_lower, engine_size_rounded_to_1_decimal)
# Covers the most common vehicles a shop will see
# ---------------------------------------------------------------------------

OIL_SPECS: Dict[tuple, Dict[str, Any]] = {
    # Honda
    ("honda", 1.5): {"viscosity": "0W-20", "capacity_qt": 3.7, "note": "1.5T turbo"},
    ("honda", 2.0): {"viscosity": "0W-20", "capacity_qt": 4.4, "note": "2.0L NA"},
    ("honda", 3.5): {"viscosity": "0W-20", "capacity_qt": 4.5, "note": "3.5L V6"},
    # Toyota
    ("toyota", 2.0): {"viscosity": "0W-16", "capacity_qt": 4.4, "note": "2.0L"},
    ("toyota", 2.5): {"viscosity": "0W-16", "capacity_qt": 4.4, "note": "2.5L"},
    ("toyota", 3.5): {"viscosity": "0W-20", "capacity_qt": 6.4, "note": "3.5L V6"},
    # Ford
    ("ford", 1.5): {"viscosity": "5W-30", "capacity_qt": 4.3, "note": "1.5T"},
    ("ford", 2.0): {"viscosity": "5W-30", "capacity_qt": 4.5, "note": "2.0T"},
    ("ford", 2.3): {"viscosity": "5W-30", "capacity_qt": 5.7, "note": "2.3T"},
    ("ford", 3.5): {"viscosity": "5W-30", "capacity_qt": 6.0, "note": "3.5T EcoBoost"},
    ("ford", 5.0): {"viscosity": "5W-20", "capacity_qt": 8.8, "note": "5.0L V8"},
    # Chevrolet / GMC
    ("chevrolet", 2.0): {"viscosity": "5W-30", "capacity_qt": 5.0, "note": "2.0T"},
    ("chevrolet", 3.6): {"viscosity": "5W-30", "capacity_qt": 6.0, "note": "3.6L V6"},
    ("chevrolet", 5.3): {"viscosity": "5W-30", "capacity_qt": 8.0, "note": "5.3L V8"},
    ("chevrolet", 6.2): {"viscosity": "0W-20", "capacity_qt": 8.0, "note": "6.2L V8"},
    ("gmc", 5.3):       {"viscosity": "5W-30", "capacity_qt": 8.0, "note": "5.3L V8"},
    # Nissan
    ("nissan", 2.5): {"viscosity": "5W-30", "capacity_qt": 4.8, "note": "2.5L"},
    ("nissan", 3.5): {"viscosity": "5W-30", "capacity_qt": 5.1, "note": "3.5L V6"},
    # Subaru
    ("subaru", 2.5): {"viscosity": "0W-20", "capacity_qt": 5.1, "note": "2.5L Boxer"},
    # Hyundai / Kia
    ("hyundai", 1.6): {"viscosity": "5W-30", "capacity_qt": 4.2, "note": "1.6T"},
    ("hyundai", 2.5): {"viscosity": "5W-30", "capacity_qt": 5.3, "note": "2.5L"},
    ("kia", 1.6):     {"viscosity": "5W-30", "capacity_qt": 4.2, "note": "1.6T"},
    ("kia", 2.5):     {"viscosity": "5W-30", "capacity_qt": 5.3, "note": "2.5L"},
    # BMW
    ("bmw", 2.0): {"viscosity": "0W-30", "capacity_qt": 5.3, "note": "2.0T B48"},
    ("bmw", 3.0): {"viscosity": "0W-30", "capacity_qt": 6.9, "note": "3.0T B58"},
}

# Fallback by make when engine size doesn't match
OIL_FALLBACK: Dict[str, Dict[str, Any]] = {
    "honda":     {"viscosity": "0W-20", "capacity_qt": 4.4},
    "toyota":    {"viscosity": "0W-16", "capacity_qt": 4.4},
    "ford":      {"viscosity": "5W-30", "capacity_qt": 5.0},
    "chevrolet": {"viscosity": "5W-30", "capacity_qt": 6.0},
    "gmc":       {"viscosity": "5W-30", "capacity_qt": 6.0},
    "nissan":    {"viscosity": "5W-30", "capacity_qt": 4.8},
    "subaru":    {"viscosity": "0W-20", "capacity_qt": 5.1},
    "hyundai":   {"viscosity": "5W-30", "capacity_qt": 4.8},
    "kia":       {"viscosity": "5W-30", "capacity_qt": 4.8},
    "bmw":       {"viscosity": "0W-30", "capacity_qt": 5.3},
}


def _parse_engine_size(size_str: str) -> Optional[float]:
    """Extract numeric engine displacement from a string like '2.0 L' or '1.5L'."""
    match = re.search(r"(\d+\.?\d*)\s*[Ll]", size_str)
    if match:
        return round(float(match.group(1)), 1)
    return None


def _extract_features(features: Dict[str, Any]) -> Dict[str, str]:
    """Flatten the features.standard list into a {name: value} dict."""
    flat: Dict[str, str] = {}
    for cat in features.get("standard", []):
        for feat in cat.get("features", []):
            name = feat.get("name", "")
            value = feat.get("value") or ""
            if name and value:
                flat[name] = value
    return flat


def _recommend_oil(make: str, engine_size: Optional[float]) -> Dict[str, Any]:
    """Return oil viscosity + capacity recommendation for a given make + engine size."""
    make_lower = make.strip().lower()
    if engine_size is not None:
        spec = OIL_SPECS.get((make_lower, engine_size))
        if spec:
            return spec
    fallback = OIL_FALLBACK.get(make_lower)
    if fallback:
        return {**fallback, "note": "fallback — verify with owner's manual"}
    return {"viscosity": "5W-30", "capacity_qt": 5.0, "note": "generic fallback"}


class CarsXEClient:
    """Fetches vehicle specs from CarsXE to drive precise parts matching."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("CARSXE_API_KEY", "")
        if not self.api_key:
            logger.warning("[CarsXE] CARSXE_API_KEY not set — vehicle specs disabled")

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    async def get_specs_by_ymm(
        self, year: int, make: str, model: str, trim: str = ""
    ) -> Dict[str, Any]:
        """Fetch vehicle specs by year/make/model (and optional trim).

        Returns a clean summary including engine config, oil recommendation,
        EV flag, and drivetrain — everything needed to identify the right parts.
        """
        if not self.enabled:
            return {"error": "CarsXE not configured", "source": "carsxe"}

        params: Dict[str, Any] = {
            "key": self.api_key,
            "year": year,
            "make": make,
            "model": model,
        }
        if trim:
            params["trim"] = trim

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{CARSXE_BASE}/v1/ymm", params=params)
                resp.raise_for_status()

            data = resp.json()
            bm = data.get("bestMatch", {})

            if not bm:
                return {
                    "error": "No data returned for this vehicle",
                    "source": "carsxe",
                    "found": False,
                }

            flat_features = _extract_features(bm.get("features", {}))

            engine_size_str = flat_features.get("Base engine size", "")
            engine_size = _parse_engine_size(engine_size_str)
            cylinders = flat_features.get("Cylinders", "")
            engine_type = flat_features.get("Base engine type", "gas")
            fuel_type = flat_features.get("Fuel type", "")
            transmission = flat_features.get("Transmission", "")
            drive_type = flat_features.get("Drive type", "")
            horsepower = flat_features.get("Horsepower", "")

            is_electric = bm.get("is_electric", False)
            is_plugin_electric = bm.get("is_plugin_electric", False)
            is_diesel = "diesel" in fuel_type.lower()

            oil_rec = None
            if not is_electric and not is_plugin_electric:
                oil_rec = _recommend_oil(make, engine_size)

            result = {
                "found": True,
                "source": "carsxe",
                "vehicle": {
                    "year": year,
                    "make": make,
                    "model": model,
                    "trim": bm.get("name", ""),
                },
                "engine": {
                    "size_liters": engine_size,
                    "size_display": engine_size_str,
                    "cylinders": cylinders,
                    "type": engine_type,
                    "horsepower": horsepower,
                },
                "fuel": {
                    "type": fuel_type,
                    "is_diesel": is_diesel,
                },
                "drivetrain": {
                    "transmission": transmission,
                    "drive_type": drive_type,
                },
                "flags": {
                    "is_electric": is_electric,
                    "is_plugin_electric": is_plugin_electric,
                    "is_hybrid": is_plugin_electric and not is_electric,
                },
                "oil_recommendation": oil_rec,
            }

            logger.info(
                f"[CarsXE] {year} {make} {model}: "
                f"engine={engine_size_str}, "
                f"EV={is_electric}, "
                f"oil={oil_rec.get('viscosity') if oil_rec else 'N/A'}"
            )
            return result

        except httpx.HTTPStatusError as e:
            logger.error(f"[CarsXE] YMM error {e.response.status_code}: {e.response.text}")
            return {"error": str(e), "source": "carsxe", "found": False}
        except Exception as e:
            logger.error(f"[CarsXE] YMM lookup failed: {e}")
            return {"error": str(e), "source": "carsxe", "found": False}

    async def get_specs_by_vin(self, vin: str) -> Dict[str, Any]:
        """Fetch vehicle specs by VIN (more precise than YMM for trimmed vehicles).

        Returns the same clean summary as get_specs_by_ymm, plus
        the decoded make/model/year for verification.
        """
        if not self.enabled:
            return {"error": "CarsXE not configured", "source": "carsxe"}

        vin = vin.strip().upper()
        if len(vin) != 17:
            return {"error": f"Invalid VIN length: {len(vin)} (expected 17)", "found": False}

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{CARSXE_BASE}/specs",
                    params={"key": self.api_key, "vin": vin},
                )
                resp.raise_for_status()

            data = resp.json()
            if not data.get("success"):
                return {
                    "error": data.get("error", "Unknown error"),
                    "source": "carsxe",
                    "found": False,
                }

            attrs = data.get("attributes", {})
            year = int(attrs.get("year", 0)) if attrs.get("year") else 0
            make = attrs.get("make", "")
            model = attrs.get("model", "")
            fuel_type = attrs.get("fuel_type", "")
            body = attrs.get("body", "")

            is_electric = "electric" in fuel_type.lower()
            is_diesel = "diesel" in fuel_type.lower()

            oil_rec = None
            if not is_electric:
                oil_rec = _recommend_oil(make, None)

            result = {
                "found": True,
                "source": "carsxe_vin",
                "vin": vin,
                "vehicle": {
                    "year": year,
                    "make": make,
                    "model": model,
                    "trim": attrs.get("series", ""),
                    "body": body,
                },
                "fuel": {
                    "type": fuel_type,
                    "is_diesel": is_diesel,
                },
                "flags": {
                    "is_electric": is_electric,
                    "is_plugin_electric": is_electric,
                },
                "oil_recommendation": oil_rec,
                "raw": attrs,
            }

            logger.info(f"[CarsXE] VIN {vin}: {year} {make} {model}, fuel={fuel_type}")
            return result

        except httpx.HTTPStatusError as e:
            logger.error(f"[CarsXE] VIN error {e.response.status_code}: {e.response.text}")
            return {"error": str(e), "source": "carsxe", "found": False}
        except Exception as e:
            logger.error(f"[CarsXE] VIN lookup failed: {e}")
            return {"error": str(e), "source": "carsxe", "found": False}
