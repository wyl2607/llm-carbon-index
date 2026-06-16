"""Phase 2 core: NormalizedRecord list -> list[ModelEstimate].

Orchestrator (loads data yamls = I/O boundary) + joins + pure math chain.
Per estimate spec: crosswalk join -> output_tokens -> energy -> grid -> CO2.
Attaches energy_source / region / carbon_intensity / grid_source / pue / flags.
Closed models receive CLOSED_MODEL_ASSUMED. Unknowns get explicit fallback flags.
No model facts (slugs, params, regions, intensities) live in this file.
"""

from __future__ import annotations

from pathlib import Path

import yaml

from pipeline.carbon import co2_kg, embodied_co2_kg, total_lca_co2_kg
from pipeline.config import (
    CLOSED_MODELS_PATH,
    CROSSWALK_PATH,
    INTENSITY_PATH,
    METHODOLOGY_FACTORS_PATH,
    VENDOR_CLAIMS_PATH,
)
from pipeline.energy import energy_kwh, wh_per_output_token
from pipeline.grid import carbon_intensity
from pipeline.ranges import Range
from pipeline.slugs import normalize_slug
from pipeline.tokens import input_tokens, output_tokens
from pipeline.types import ModelEstimate, NormalizedRecord
from pipeline.water import water_liters


def _load_yaml_list(path: Path) -> list[dict]:
    """Load a YAML file expected to be a list of dicts.

    Replicates the exact original pattern used for crosswalk, closed_models,
    vendor_claims etc.:
      - utf-8 open
      - yaml.safe_load
      - if list: keep only dict items
      - ANY exception (FileNotFound, parse error, etc.) or wrong type -> []
    This ensures 100% identical fallback behavior and is the direct analogue
    of the _as_range extraction.
    """
    items: list[dict] = []
    try:
        with open(path, encoding="utf-8") as f:
            loaded = yaml.safe_load(f)
            if isinstance(loaded, list):
                items = [e for e in loaded if isinstance(e, dict)]
    except Exception:
        items = []
    return items


def _load_yaml_dict(path: Path) -> dict:
    """Same pattern for YAML files expected to be a top-level dict (intensity, factors)."""
    data: dict = {}
    try:
        with open(path, encoding="utf-8") as f:
            loaded = yaml.safe_load(f)
            if isinstance(loaded, dict):
                data = loaded
    except Exception:
        data = {}
    return data


def estimate(records: list[NormalizedRecord]) -> list[ModelEstimate]:
    """Compute per-model energy + CO2 estimates for the supplied normalized records.

    Only non-`is_other` records produce ModelEstimate rows (the `other` aggregate
    is handled in totals by Phase 3). Every row carries full ranges; no bare numbers.
    """
    # --- load injected data tables (I/O isolated here; pure funcs receive dicts) ---
    crosswalk: list[dict] = _load_yaml_list(CROSSWALK_PATH)
    intensity: dict = _load_yaml_dict(INTENSITY_PATH)

    closed_list: list[dict] = _load_yaml_list(CLOSED_MODELS_PATH)

    closed_map: dict[str, dict] = {
        (e.get("provider") or ""): e for e in closed_list if e.get("provider")
    }

    vendor_claims_list: list[dict] = _load_yaml_list(VENDOR_CLAIMS_PATH)

    vendor_claims_map: dict[str, float] = {
        (e.get("provider") or ""): float(e.get("annual_renewable_match_pct", 0))
        for e in vendor_claims_list if e.get("provider")
    }

    # v0.2 methodology factors (PUE band, prefill alpha, embodied ratio, water split).
    # Loaded here at the I/O boundary; pure math funcs receive Ranges/scalars.
    factors: dict = _load_yaml_dict(METHODOLOGY_FACTORS_PATH)

    def _range(d: dict | None, lo: float, mi: float, hi: float) -> Range:
        d = d or {}
        return Range(
            float(d.get("low", lo)), float(d.get("mid", mi)), float(d.get("high", hi))
        )

    pue_range = _range(factors.get("pue"), 1.1, 1.25, 1.56)
    prefill_alpha = _range(factors.get("prefill_alpha"), 0.1, 0.2, 0.3)
    embodied_ratio = _range(factors.get("embodied_ratio"), 0.28, 0.39, 0.54)
    water_cfg = factors.get("water") or {}
    onsite_wue = _range(water_cfg.get("onsite_wue"), 0.3, 0.9, 1.8)
    offsite_ewif = _range(water_cfg.get("offsite_ewif"), 2.0, 3.14, 4.35)

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

        # 1. tokens (A2): output drives decode, input drives prefill (E-PREFILL)
        est_out = output_tokens(total_tokens)
        est_in = input_tokens(total_tokens, est_out)

        # 2. wh per output token (with fallback labels)
        wh_r, energy_src, eflags = wh_per_output_token(slug, crosswalk, intensity)

        # 3. kWh = decode(output) + prefill(input) (pure; /1000 guard inside)
        energy_r = energy_kwh(wh_r, est_out, est_in, prefill_alpha)

        # 4. grid (live or annual labelled)
        gco2, grid_src = carbon_intensity(region)

        # 5. PUE as a band (A4 revised). A known provider PUE centres the band's mid;
        #    low/high come from the Uptime-informed global band.
        pue_mid = pue_range.mid
        if open_or_closed == "closed" and assumed_provider and assumed_provider in closed_map:
            pue_mid = float(closed_map[assumed_provider].get("pue", pue_range.mid))
        model_pue_range = Range(pue_range.low, pue_mid, pue_range.high)
        pue = pue_mid  # representative scalar emitted for display/scenario

        # 6. Operational CO2 (location-based), PUE band widens the spread
        co2_r = co2_kg(energy_r, gco2, model_pue_range)

        # 6b. Embodied (amortised manufacturing) CO2 + full-lifecycle total (C-EMBODIED)
        co2_embodied_r = embodied_co2_kg(co2_r, embodied_ratio)
        co2_total_r = total_lca_co2_kg(co2_r, co2_embodied_r)

        # 7. Market-based CO2 (operational; vendor renewable match)
        match_pct = None
        if assumed_provider and assumed_provider in vendor_claims_map:
            match_pct = vendor_claims_map[assumed_provider]

        market_factor = 1 - (match_pct or 0.0) / 100.0
        co2_market_r = co2_r * market_factor

        # 8. Water footprint: facility energy * (on-site WUE + off-site EWIF) (W-WATER)
        facility_energy_r = energy_r * pue_mid
        water_r = water_liters(facility_energy_r, onsite_wue, offsite_ewif)
        wue = onsite_wue.mid + offsite_ewif.mid  # representative combined L/kWh

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
            "co2_kg_embodied": co2_embodied_r.to_dict(),
            "co2_kg_total": co2_total_r.to_dict(),
            "renewable_match_pct": match_pct,
            "co2_kg_market": co2_market_r.to_dict(),
            "wue": wue,
            "water_liters": water_r.to_dict(),
            "flags": uniq_flags,
        }
        results.append(est)

    return results
