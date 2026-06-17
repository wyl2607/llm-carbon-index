"""Grid carbon intensity (gCO2/kWh).

I/O module per ENGINEERING_STANDARDS §1: live Electricity Maps query
(with injected key from config) + file fallback load of annual_factors.

Public surface: carbon_intensity(region) -> (gco2_per_kwh, grid_source, source_id)
Never raises to caller on failure/unknown; always falls back and labels source.
The source_id (Phase 6G) is the provenance key of the figure actually used:
"GRID-EM-LIVE" for live, else the annual_factors row's source_id.

L2 resolution: the live path is attempted only when electricitymaps_api_key()
returns truthy AND em_zone_for_region finds a zone for the region. On any
error (incl. missing key, which is the case for all reproducibility harness
runs) it falls back to annual_factor and records that source explicitly.
Live values are never required for verify (grid_replay supplies frozen).
Annual fallback usage is always labelled; no number is sourceless.
See docs/methodology.md for current status (grid_live_fraction permanently 0
in published series under the present operational constraints).
"""

from __future__ import annotations

import requests
import yaml

from pipeline.config import (
    ANNUAL_FACTORS_PATH,
    ELECTRICITYMAPS_BASE_URL,
    electricitymaps_api_key,
)


def _load_annual() -> list[dict]:
    """Load the annual_factors table (list of region dicts). [] on any failure."""
    try:
        with open(ANNUAL_FACTORS_PATH, encoding="utf-8") as f:
            loaded = yaml.safe_load(f)
            if isinstance(loaded, list):
                return [e for e in loaded if isinstance(e, dict)]
    except Exception:  # noqa: S110 - missing/unreadable table -> empty (caller falls back)
        pass
    return []


def em_zone_for_region(region: str, annual: list[dict]) -> str | None:
    """Resolve the Electricity Maps zone code for an internal region key.

    Internal region keys ("us-east", "europe-west", ...) are NOT valid Electricity
    Maps zones (which are codes like "DE", "CN", "US-MIDA-PJM"). The mapping lives
    in annual_factors.yaml as an `electricitymaps_zone` field per region. Returns
    None when the region is unknown or has no mapped zone, so the live query is
    skipped (and the annual factor is used) instead of querying an invalid zone
    that would always 4xx and silently degrade.
    """
    for entry in annual:
        if entry.get("region") == region:
            zone = entry.get("electricitymaps_zone")
            return str(zone) if zone else None
    return None


def carbon_intensity(region: str) -> tuple[float, str, str]:
    """Return (gCO2eq per kWh, source_label, source_id) for the given region key.

    Region keys are shared with annual_factors.yaml and crosswalk assumed_region
    (e.g. "us-east", "europe-west", "cn-north").

    Attempt:
    - If ELECTRICITYMAPS_API_KEY present AND the region maps to a real Electricity
      Maps zone (annual_factors.yaml `electricitymaps_zone`): GET
      /v3/carbon-intensity/latest?zone={zone} with header "auth-token". On any
      failure (network, 4xx/5xx, bad payload, unknown zone, rate limit) fall through.
    - Fallback: ANNUAL_FACTORS_PATH exact region match -> value + "annual_factor".
      If region unknown in table, use seeded "default" entry (or first entry).
      Source label is always "annual_factor" for the fallback path.

    Respects free-tier terms (no caching here; Phase 3+ may add). Never silent 0.
    """
    annual = _load_annual()
    key = electricitymaps_api_key()
    zone = em_zone_for_region(region, annual)
    if key and zone:
        try:
            url = f"{ELECTRICITYMAPS_BASE_URL}/carbon-intensity/latest?zone={zone}"
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
