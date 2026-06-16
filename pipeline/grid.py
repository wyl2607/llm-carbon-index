"""Grid carbon intensity (gCO2/kWh).

I/O module per ENGINEERING_STANDARDS §1: live Electricity Maps query
(with injected key from config) + file fallback load of annual_factors.

Public surface: carbon_intensity(region) -> (gco2_per_kwh, grid_source, source_id)
Never raises to caller on failure/unknown; always falls back and labels source.
The source_id (Phase 6G) is the provenance key of the figure actually used:
"GRID-EM-LIVE" for live, else the annual_factors row's source_id.
"""

from __future__ import annotations

import requests
import yaml

from pipeline.config import (
    ANNUAL_FACTORS_PATH,
    ELECTRICITYMAPS_BASE_URL,
    electricitymaps_api_key,
)


def carbon_intensity(region: str) -> tuple[float, str, str]:
    """Return (gCO2eq per kWh, source_label, source_id) for the given region key.

    Region keys are shared with annual_factors.yaml and crosswalk assumed_region
    (e.g. "us-east", "europe-west", "cn-north").

    Attempt:
    - If ELECTRICITYMAPS_API_KEY present: GET /v3/carbon-intensity/latest?zone={region}
      with header "auth-token". On any failure (network, 4xx/5xx, bad payload,
      unknown zone, rate limit) fall through.
    - Fallback: load ANNUAL_FACTORS_PATH, exact region match -> value + "annual_factor".
      If region unknown in table, use seeded "default" entry (or first entry).
      Source label is always "annual_factor" for the fallback path.

    Respects free-tier terms (no caching here; Phase 3+ may add). Never silent 0.
    """
    key = electricitymaps_api_key()
    if key:
        try:
            url = f"{ELECTRICITYMAPS_BASE_URL}/carbon-intensity/latest?zone={region}"
            resp = requests.get(
                url, headers={"auth-token": key}, timeout=12
            )
            if resp.ok:
                try:
                    payload = resp.json()
                    ci: float | None = None
                    if isinstance(payload, dict):
                        ci = payload.get("carbonIntensity") or payload.get("carbon_intensity")
                        if ci is None and isinstance(payload.get("data"), dict):
                            d = payload["data"]
                            ci = d.get("carbonIntensity") or d.get("carbon_intensity")
                    if ci is not None:
                        return float(ci), "electricity_maps_live", "GRID-EM-LIVE"
                except Exception:  # noqa: S110 - intentional: any live failure must fall back
                    # bad json or missing key -> fallback
                    pass
        except Exception:  # noqa: S110 - intentional: any live failure must fall back
            # network / timeout / dns etc -> fallback
            pass

    # --- annual factor fallback (never raises) ---
    annual: list[dict] = []
    try:
        with open(ANNUAL_FACTORS_PATH, encoding="utf-8") as f:
            loaded = yaml.safe_load(f)
            if isinstance(loaded, list):
                annual = [e for e in loaded if isinstance(e, dict)]
    except Exception:
        annual = []

    # exact match first
    for entry in annual:
        if entry.get("region") == region:
            val = entry.get("gco2_per_kwh")
            if val is not None:
                return float(val), "annual_factor", entry.get("source_id", "C-GRID-DEFAULT-400")

    # seeded default (see data/grid/annual_factors.yaml + ASSUMPTIONS C-GRID-DEFAULT)
    for entry in annual:
        if entry.get("region") == "default":
            val = entry.get("gco2_per_kwh")
            if val is not None:
                return float(val), "annual_factor", entry.get("source_id", "C-GRID-DEFAULT-400")

    # last-resort: first entry if table present (all used regions are seeded;
    # this path exists only for data corruption safety)
    for entry in annual:
        val = entry.get("gco2_per_kwh")
        if val is not None:
            return float(val), "annual_factor", entry.get("source_id", "C-GRID-DEFAULT-400")

    # absolute last resort (data file missing entirely) — still labelled, non-zero
    # value chosen to match order of magnitude of seeded US factor (EPA eGRID cited)
    # comment required because this is a constant path
    return 380.0, "annual_factor", "C-GRID-EGRID"
