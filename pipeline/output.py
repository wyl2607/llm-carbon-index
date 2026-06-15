"""Phase 3: assemble and persist the validated latest.json + history copy.

Consumes ModelEstimate list (from estimate) + the full NormalizedRecord list
(for totals incl. the is_other row). All energy/CO2 values remain RangeDicts.
"""
from __future__ import annotations

import json
import logging
from collections.abc import Iterable
from datetime import datetime, timezone

import jsonschema

import pipeline.config as config
from pipeline import METHODOLOGY_VERSION
from pipeline.types import ModelEstimate, NormalizedRecord

log = logging.getLogger(__name__)


def build_output(
    estimates: list[ModelEstimate],
    records: list[NormalizedRecord],
    data_date: str,
    generated_at: str | None = None,
) -> dict:
    """Assemble the top-level output document per DATA_SCHEMAS.md §1.

    - methodology_version from pipeline.METHODOLOGY_VERSION
    - generated_at: ISO-8601 UTC Z (caller may supply fixed for determinism)
    - source_citation uses the exact required attribution string
    - scope_note is the exact fixed string
    - assumptions snapshot (input_output_ratio + default_pue)
    - models: the provided estimates (excludes other aggregate)
    - totals: total_tokens (all records), uncovered from is_other row,
      modeled_traffic_fraction, endpoint-wise summed co2_kg ranges for modeled,
      plus by_origin and by_open_closed breakdowns (sums per group).
    """
    if generated_at is None:
        generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    source_citation = f"Source: OpenRouter (openrouter.ai/rankings), as of {data_date}"
    scope_note = (
        "Estimated CO2 footprint of LLM-inference traffic visible through OpenRouter. "
        "NOT global data-center emissions. All figures are estimates with uncertainty."
    )
    assumptions = {
        "input_output_ratio": "80:20",
        "default_pue": 1.2,
    }

    # Totals from ALL records for the day (incl. the other aggregate)
    total_tokens = sum(int(r.get("total_tokens", 0)) for r in records)
    uncovered_tokens = 0
    for r in records:
        if r.get("is_other"):
            uncovered_tokens = int(r.get("total_tokens", 0))
            break
    if total_tokens > 0:
        modeled_traffic_fraction: float = (total_tokens - uncovered_tokens) / total_tokens
    else:
        modeled_traffic_fraction = 0.0

    # Phase 6E coverage / scope honesty: top-list slugs absent from the crosswalk are
    # flagged UNMAPPED_SLUG in estimate.py (never silently bucketed). Quantify them here
    # so modeled_traffic_fraction is not silently overstated by guessed-at unknowns.
    unmapped = [m for m in estimates if "UNMAPPED_SLUG" in m.get("flags", [])]
    unmapped_tokens = sum(int(m.get("total_tokens", 0)) for m in unmapped)
    unmapped_slugs = sorted(
        ({"slug": m["slug"], "total_tokens": int(m.get("total_tokens", 0))} for m in unmapped),
        key=lambda d: d["total_tokens"],
        reverse=True,
    )
    if total_tokens > 0:
        unmapped_traffic_fraction = unmapped_tokens / total_tokens
        mapped_traffic_fraction = (
            total_tokens - uncovered_tokens - unmapped_tokens
        ) / total_tokens
    else:
        unmapped_traffic_fraction = 0.0
        mapped_traffic_fraction = 0.0

    if unmapped_slugs:
        log.warning(
            "Phase 6E coverage: %d OpenRouter top-list slug(s) (%.1f%% of traffic) are "
            "absent from data/crosswalk/model_crosswalk.yaml and were flagged "
            "UNMAPPED_SLUG (not silently bucketed). Add them with sources: %s",
            len(unmapped_slugs),
            unmapped_traffic_fraction * 100.0,
            ", ".join(d["slug"] for d in unmapped_slugs[:10]),
        )

    def _sum_co2(rs: Iterable[dict]) -> dict:
        rs = list(rs)
        if not rs:
            return {"low": 0.0, "mid": 0.0, "high": 0.0}
        return {
            "low": sum(float(r["low"]) for r in rs),
            "mid": sum(float(r["mid"]) for r in rs),
            "high": sum(float(r["high"]) for r in rs),
        }

    co2_list = [m["co2_kg"] for m in estimates]
    co2_kg = _sum_co2(co2_list)

    co2_market_list = [m.get("co2_kg_market", m["co2_kg"]) for m in estimates]
    co2_kg_market = _sum_co2(co2_market_list)
    
    water_list = [m.get("water_liters", {"low": 0.0, "mid": 0.0, "high": 0.0}) for m in estimates]
    water_liters = _sum_co2(water_list)

    est_output_tokens = sum(int(m.get("est_output_tokens", 0)) for m in estimates)
    energy_list = [m.get("energy_kwh", {"low": 0.0, "mid": 0.0, "high": 0.0}) for m in estimates]
    energy_kwh = _sum_co2(energy_list)

    # by_origin and by_open_closed preserve first-appearance order from estimates list
    origin_groups: dict[str, list[dict]] = {}
    origin_groups_market: dict[str, list[dict]] = {}
    origin_groups_water: dict[str, list[dict]] = {}
    for m in estimates:
        o = m["origin"]
        origin_groups.setdefault(o, []).append(m["co2_kg"])
        origin_groups_market.setdefault(o, []).append(m.get("co2_kg_market", m["co2_kg"]))
        origin_groups_water.setdefault(o, []).append(
            m.get("water_liters", {"low": 0.0, "mid": 0.0, "high": 0.0})
        )
    by_origin = {
        o: {
            "co2_kg": _sum_co2(origin_groups[o]), 
            "co2_kg_market": _sum_co2(origin_groups_market[o]),
            "water_liters": _sum_co2(origin_groups_water[o])
        }
        for o in origin_groups
    }

    oc_groups: dict[str, list[dict]] = {}
    oc_groups_market: dict[str, list[dict]] = {}
    oc_groups_water: dict[str, list[dict]] = {}
    for m in estimates:
        oc = m["open_or_closed"]
        oc_groups.setdefault(oc, []).append(m["co2_kg"])
        oc_groups_market.setdefault(oc, []).append(m.get("co2_kg_market", m["co2_kg"]))
        oc_groups_water.setdefault(oc, []).append(
            m.get("water_liters", {"low": 0.0, "mid": 0.0, "high": 0.0})
        )
    by_open_closed = {
        oc: {
            "co2_kg": _sum_co2(oc_groups[oc]), 
            "co2_kg_market": _sum_co2(oc_groups_market[oc]),
            "water_liters": _sum_co2(oc_groups_water[oc])
        }
        for oc in oc_groups
    }

    totals = {
        "total_tokens": total_tokens,
        "uncovered_tokens": uncovered_tokens,
        "modeled_traffic_fraction": modeled_traffic_fraction,
        "mapped_traffic_fraction": mapped_traffic_fraction,
        "unmapped_tokens": unmapped_tokens,
        "unmapped_traffic_fraction": unmapped_traffic_fraction,
        "unmapped_slugs": unmapped_slugs,
        "est_output_tokens": est_output_tokens,
        "energy_kwh": energy_kwh,
        "co2_kg": co2_kg,
        "co2_kg_market": co2_kg_market,
        "water_liters": water_liters,
        "by_origin": by_origin,
        "by_open_closed": by_open_closed,
    }

    doc: dict = {
        "methodology_version": METHODOLOGY_VERSION,
        "generated_at": generated_at,
        "data_date": data_date,
        "source_citation": source_citation,
        "scope_note": scope_note,
        "assumptions": assumptions,
        "models": list(estimates),
        "totals": totals,
    }
    return doc


def validate(doc: dict) -> None:
    """Validate doc against schemas/output.schema.json using jsonschema.

    Raises jsonschema.ValidationError (or schema load errors) if invalid.
    """
    schema_path = config.SCHEMA_PATH
    with open(schema_path, "r", encoding="utf-8") as f:
        schema = json.load(f)
    jsonschema.validate(instance=doc, schema=schema)


def write_outputs(doc: dict) -> None:
    """Validate first, then write OUTPUT_LATEST_PATH and history/{data_date}.json.

    Never writes an invalid document.
    """
    validate(doc)
    data_date: str = doc["data_date"]

    # latest
    latest_path = config.OUTPUT_LATEST_PATH
    latest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(latest_path, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
        f.write("\n")

    # history snapshot
    hist_dir = config.OUTPUT_HISTORY_DIR
    hist_dir.mkdir(parents=True, exist_ok=True)
    hist_path = hist_dir / f"{data_date}.json"
    with open(hist_path, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
        f.write("\n")

    # Generate timeseries
    write_timeseries()

def write_timeseries() -> None:
    """Aggregate data from all history/*.json files into timeseries.json."""
    hist_dir = config.OUTPUT_HISTORY_DIR
    if not hist_dir.exists():
        return
        
    timeseries = []
    
    for hist_file in sorted(hist_dir.glob("*.json")):
        with open(hist_file, "r", encoding="utf-8") as f:
            try:
                day_data = json.load(f)
                timeseries.append({
                    "data_date": day_data["data_date"],
                    "totals": day_data["totals"]
                })
            except (json.JSONDecodeError, KeyError):
                continue
                
    if timeseries:
        timeseries_path = config.OUTPUT_TIMESERIES_PATH
        with open(timeseries_path, "w", encoding="utf-8") as f:
            json.dump(timeseries, f, ensure_ascii=False, indent=2)
            f.write("\n")
