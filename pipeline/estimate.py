"""Phase 2 core: NormalizedRecord list -> list[ModelEstimate].

Orchestrator (loads data yamls = I/O boundary) + joins + pure math chain.
Per estimate spec: crosswalk join -> output_tokens -> energy -> grid -> CO2.
Attaches energy_source / region / carbon_intensity / grid_source / pue / flags.
Closed models receive CLOSED_MODEL_ASSUMED. Unknowns get explicit fallback flags.
No model facts (slugs, params, regions, intensities) live in this file.
"""

from __future__ import annotations

import yaml

from pipeline.carbon import co2_kg
from pipeline.config import (
    CLOSED_MODELS_PATH,
    CROSSWALK_PATH,
    INTENSITY_PATH,
    VENDOR_CLAIMS_PATH,
)
from pipeline.energy import energy_kwh, wh_per_output_token
from pipeline.grid import carbon_intensity
from pipeline.ranges import Range
from pipeline.slugs import normalize_slug
from pipeline.tokens import output_tokens
from pipeline.types import ModelEstimate, NormalizedRecord


def estimate(records: list[NormalizedRecord]) -> list[ModelEstimate]:
    """Compute per-model energy + CO2 estimates for the supplied normalized records.

    Only non-`is_other` records produce ModelEstimate rows (the `other` aggregate
    is handled in totals by Phase 3). Every row carries full ranges; no bare numbers.
    """
    # --- load injected data tables (I/O isolated here; pure funcs receive dicts) ---
    crosswalk: list[dict] = []
    try:
        with open(CROSSWALK_PATH, encoding="utf-8") as f:
            loaded = yaml.safe_load(f)
            if isinstance(loaded, list):
                crosswalk = [e for e in loaded if isinstance(e, dict)]
    except Exception:
        crosswalk = []

    intensity: dict = {}
    try:
        with open(INTENSITY_PATH, encoding="utf-8") as f:
            loaded = yaml.safe_load(f)
            if isinstance(loaded, dict):
                intensity = loaded
    except Exception:
        intensity = {}

    closed_list: list[dict] = []
    try:
        with open(CLOSED_MODELS_PATH, encoding="utf-8") as f:
            loaded = yaml.safe_load(f)
            if isinstance(loaded, list):
                closed_list = [e for e in loaded if isinstance(e, dict)]
    except Exception:
        closed_list = []

    closed_map: dict[str, dict] = {
        (e.get("provider") or ""): e for e in closed_list if e.get("provider")
    }

    vendor_claims_list: list[dict] = []
    try:
        with open(VENDOR_CLAIMS_PATH, encoding="utf-8") as f:
            loaded = yaml.safe_load(f)
            if isinstance(loaded, list):
                vendor_claims_list = [e for e in loaded if isinstance(e, dict)]
    except Exception:
        vendor_claims_list = []

    vendor_claims_map: dict[str, float] = {
        (e.get("provider") or ""): float(e.get("annual_renewable_match_pct", 0))
        for e in vendor_claims_list if e.get("provider")
    }

    results: list[ModelEstimate] = []

    for rec in records:
        if rec.get("is_other"):
            # other aggregate is uncovered; Phase 3 accounts it in totals.uncovered_tokens
            continue

        slug: str = rec["model_slug"]
        total_tokens: int = int(rec["total_tokens"])

        # crosswalk identity (origin / open_or_closed / region / energy_source tag)
        norm = normalize_slug(slug)
        cw = next((e for e in crosswalk if e.get("openrouter_slug") == norm), None)
        if cw:
            display_name: str = cw.get("display_name", slug)
            origin = cw.get("origin", "OTHER")
            open_or_closed = cw.get("open_or_closed", "open")
            region: str = cw.get("assumed_region", "us-east")
            assumed_provider = cw.get("assumed_provider")
        else:
            display_name = slug
            origin = "OTHER"
            open_or_closed = "open"
            region = "us-east"
            assumed_provider = None

        # 1. output tokens (A2)
        est_out = output_tokens(total_tokens)

        # 2. wh per output token (with fallback labels)
        wh_r, energy_src, eflags = wh_per_output_token(slug, crosswalk, intensity)

        # 3. kWh (pure; /1000 guard inside)
        energy_r = energy_kwh(wh_r, est_out)

        # 4. grid (live or annual labelled)
        gco2, grid_src = carbon_intensity(region)

        # 5. pue (default 1.2 per A4; override only for closed via closed_models)
        pue = 1.2  # default hyperscaler per ASSUMPTIONS.md#A4 / DATA_SCHEMAS
        if open_or_closed == "closed" and assumed_provider and assumed_provider in closed_map:
            pue = float(closed_map[assumed_provider].get("pue", 1.2))

        # 6. CO2 (pure location-based)
        co2_r = co2_kg(energy_r, gco2, pue)

        # 7. Market-based CO2
        match_pct = None
        if assumed_provider and assumed_provider in vendor_claims_map:
            match_pct = vendor_claims_map[assumed_provider]
            
        market_low = co2_r.low * (1 - (match_pct or 0.0) / 100.0)
        market_mid = co2_r.mid * (1 - (match_pct or 0.0) / 100.0)
        market_high = co2_r.high * (1 - (match_pct or 0.0) / 100.0)
        co2_market_r = Range(market_low, market_mid, market_high)

        # 8. Water Footprint (WUE)
        wue = 1.5  # default ASSUMPTIONS.md global average
        if open_or_closed == "closed" and assumed_provider and assumed_provider in closed_map:
            wue = float(closed_map[assumed_provider].get("wue", 1.5))
            
        water_low = energy_r.low * wue
        water_mid = energy_r.mid * wue
        water_high = energy_r.high * wue
        water_r = Range(water_low, water_mid, water_high)

        # flags assembly
        flags: list[str] = list(eflags)
        if cw is None:
            # Phase 6E: top-list slug absent from model_crosswalk.yaml. Flag it so it is
            # never silently bucketed as "modeled"; output.py quantifies the unmapped %.
            flags.append("UNMAPPED_SLUG")
        if grid_src == "annual_factor":
            flags.append("FALLBACK_GRID_ANNUAL")
        if open_or_closed == "closed":
            flags.append("CLOSED_MODEL_ASSUMED")
        # de-dupe while preserving a stable order
        seen: set[str] = set()
        uniq_flags: list[str] = []
        for fl in flags:
            if fl not in seen:
                seen.add(fl)
                uniq_flags.append(fl)

        est: ModelEstimate = {
            "slug": slug,
            "display_name": display_name,
            "origin": origin,
            "open_or_closed": open_or_closed,
            "total_tokens": total_tokens,
            "est_output_tokens": est_out,
            "wh_per_output_token": wh_r.to_dict(),
            "energy_kwh": energy_r.to_dict(),
            "energy_source": energy_src,
            "region": region,
            "carbon_intensity_gco2_kwh": gco2,
            "grid_source": grid_src,
            "pue": pue,
            "co2_kg": co2_r.to_dict(),
            "renewable_match_pct": match_pct,
            "co2_kg_market": co2_market_r.to_dict(),
            "wue": wue,
            "water_liters": water_r.to_dict(),
            "flags": uniq_flags,
        }
        results.append(est)

    return results
