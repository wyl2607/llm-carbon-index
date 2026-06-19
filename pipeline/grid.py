"""Grid carbon intensity (gCO2/kWh).

I/O module per ENGINEERING_STANDARDS §1: live Electricity Maps query
(with injected key from config) + EIA fuel-type hourly for us-east (PJM) +
file fallback load of annual_factors.

Public surface: carbon_intensity(region) -> (gco2_per_kwh, grid_source, source_id)
Never raises to caller on failure/unknown; always falls back and labels source.
The source_id (Phase 6G) is the provenance key of the figure actually used:
"GRID-EM-LIVE" or "GRID-EIA-PJM-HOURLY" for live, else the annual_factors row's source_id.

L2 resolution: the live path is attempted only when the relevant key is present
(EM key + zone, or EIA key for us-east). On any error it falls back to
annual_factor and records that source explicitly. Live values are never required
for verify (grid_replay supplies frozen). Annual fallback usage is always
labelled; no number is sourceless.
See docs/methodology.md for current status.
"""

from __future__ import annotations

import requests
import yaml

from pipeline.config import (
    ANNUAL_FACTORS_PATH,
    ELECTRICITYMAPS_BASE_URL,
    eia_api_key,
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


def _load_fuel_factors() -> dict[str, tuple[float, str]]:
    """Load fuel -> (gco2_per_kwh, source_id) for EIA weighting. {} on failure."""
    path = ANNUAL_FACTORS_PATH.parent / "fuel_emission_factors.yaml"
    try:
        with open(path, encoding="utf-8") as f:
            loaded = yaml.safe_load(f)
            if isinstance(loaded, list):
                out: dict[str, tuple[float, str]] = {}
                for e in loaded:
                    if isinstance(e, dict) and e.get("fuel"):
                        g = e.get("gco2_per_kwh")
                        sid = e.get("source_id")
                        if g is not None and sid:
                            out[str(e["fuel"])] = (float(g), str(sid))
                return out
    except Exception:  # noqa: S110
        pass
    return {}


def _fetch_eia_pjm_intensity(key: str) -> float | None:
    """Return latest hourly weighted gCO2/kWh for PJM from EIA, or None on any failure."""
    try:
        url = "https://api.eia.gov/v2/electricity/rto/fuel-type-data/data/"
        params = {
            "api_key": key,
            "frequency": "hourly",
            "data[0]": "value",
            "facets[respondent][]": "PJM",
            "sort[0][column]": "period",
            "sort[0][direction]": "desc",
            "offset": 0,
            "length": 100,
        }
        resp = requests.get(url, params=params, timeout=15)
        if not resp.ok:
            return None
        payload = resp.json()
        rows = []
        if isinstance(payload, dict):
            resp_data = payload.get("response", {})
            if isinstance(resp_data, dict):
                rows = resp_data.get("data", []) or []
        if not rows:
            return None

        # Group by period (take most recent); value may be str since 2024
        by_period: dict[str, list[dict]] = {}
        for r in rows:
            if not isinstance(r, dict):
                continue
            per = r.get("period")
            if per:
                by_period.setdefault(str(per), []).append(r)

        if not by_period:
            return None
        latest_period = max(by_period.keys())
        hour_rows = by_period[latest_period]

        factors = _load_fuel_factors()
        total_gen = 0.0
        total_co2 = 0.0
        for r in hour_rows:
            ft = str(r.get("fueltype", "")).upper()
            v = r.get("value")
            try:
                val = float(v)
            except (TypeError, ValueError):
                continue
            if ft in factors:
                g, _ = factors[ft]
                total_gen += val
                total_co2 += val * g
            # unknown fuels ignored (conservative, or treat 0)

        if total_gen > 0:
            return total_co2 / total_gen
    except Exception:  # noqa: S110
        pass
    return None


def carbon_intensity(region: str) -> tuple[float, str, str]:
    """Return (gCO2eq per kWh, source_label, source_id) for the given region key.

    Region keys are shared with annual_factors.yaml and crosswalk assumed_region
    (e.g. "us-east", "europe-west", "cn-north").

    Attempt order:
    - If EIA_API_KEY present AND region=="us-east": query EIA v2 fuel-type-data
      for PJM (hourly, latest period), weight by fuel gen using factors in
      fuel_emission_factors.yaml. Returns "eia_live", "GRID-EIA-PJM-HOURLY".
    - Else if ELECTRICITYMAPS_API_KEY present AND zone mapped: EM /v3/... live.
    - Fallback: annual_factors exact match (labelled "annual_factor").

    Any error (missing key, network, parse, bad data) falls through silently
    to annual. Never silent 0. Snapshot/replay records the value+label used.
    """
    annual = _load_annual()

    # EIA path (us-east only, highest priority free real-time source for this region)
    if region == "us-east":
        ekey = eia_api_key()
        if ekey:
            ci = _fetch_eia_pjm_intensity(ekey)
            if ci is not None:
                return float(ci), "eia_live", "GRID-EIA-PJM-HOURLY"

    # Electricity Maps path (other regions)
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
                    pass
        except Exception:  # noqa: S110
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
