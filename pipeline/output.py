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
import yaml

import pipeline.config as config
from pipeline import METHODOLOGY_VERSION
from pipeline.fairness import indistinguishable_tiers, rank_stability
from pipeline.precision import energy_tier, grid_tier, precision_fractions
from pipeline.provenance import compact_sources, load_sources
from pipeline.sensitivity import oat_sensitivity
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
        "pue_band": "1.1 / 1.25 / 1.56",
        "prefill_alpha": "0.1 / 0.2 / 0.3",
        "embodied_ratio_of_operational": "0.28 / 0.39 / 0.54",
        "water_l_per_kwh": "onsite 0.3/0.9/1.8 + offsite EWIF 2.0/3.14/4.35",
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

    def _load_alt_assumption_sets() -> list[dict]:
        """I/O boundary only (yaml load). Returns the alt_sets list for rank_stability.
        Pure computation lives in pipeline.fairness (no import-time I/O).
        """
        p = config.ALT_ASSUMPTION_SETS_PATH
        try:
            with open(p, encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
            raw = data.get("alt_sets") or data.get("assumption_sets") or []
            if isinstance(raw, list):
                return [s for s in raw if isinstance(s, dict)]
        except Exception:  # noqa: S110 - deliberate fallback for missing alt sets
            # absence or unreadable -> empty (stability report will be all-zero)
            pass
        return []

    co2_list = [m["co2_kg"] for m in estimates]
    co2_kg = _sum_co2(co2_list)

    _zero = {"low": 0.0, "mid": 0.0, "high": 0.0}
    co2_embodied_list = [m.get("co2_kg_embodied", _zero) for m in estimates]
    co2_kg_embodied = _sum_co2(co2_embodied_list)

    co2_total_list = [m.get("co2_kg_total", m["co2_kg"]) for m in estimates]
    co2_kg_total = _sum_co2(co2_total_list)

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

    # Phase 6F estimation-tier honesty: token-weighted measured-vs-fallback fractions
    # over the modeled records (estimates already exclude the is_other aggregate),
    # plus a count companion for legible UI copy. Reports existing flags only — no
    # new sourced numbers (CLAUDE.md scope statement reinforced, not weakened).
    precision = dict(precision_fractions(estimates))
    precision["models_total"] = len(estimates)
    precision["models_measured"] = sum(
        1 for m in estimates if energy_tier(m) == "measured"
    )
    precision["grid_live_models"] = sum(1 for m in estimates if grid_tier(m) == "live")

    totals = {
        "total_tokens": total_tokens,
        "uncovered_tokens": uncovered_tokens,
        "modeled_traffic_fraction": modeled_traffic_fraction,
        "precision": precision,
        "mapped_traffic_fraction": mapped_traffic_fraction,
        "unmapped_tokens": unmapped_tokens,
        "unmapped_traffic_fraction": unmapped_traffic_fraction,
        "unmapped_slugs": unmapped_slugs,
        "est_output_tokens": est_output_tokens,
        "energy_kwh": energy_kwh,
        "co2_kg": co2_kg,
        "co2_kg_embodied": co2_kg_embodied,
        "co2_kg_total": co2_kg_total,
        "co2_kg_market": co2_kg_market,
        "water_liters": water_liters,
        "by_origin": by_origin,
        "by_open_closed": by_open_closed,
    }

    # Phase 6I (Tasks 3+4 + interfaces): fairness diagnostics.
    # rank_stability recomputes top-N (by total CO2 and by efficiency=
    # CO2 per output token) under each alt set from alt_assumption_sets.yaml
    # and reports {top_n, ranks_changed, max_displacement}.
    # unweighted.co2_kg is the EQUAL-WEIGHT MEAN of per-model co2_kg (total / N
    # models) — the "average modeled-model footprint" companion to the
    # traffic-weighted total, so the headline isn't read as one popular model's
    # artifact (FAIRNESS.md §4). A genuinely different number from totals.co2_kg.
    # Exact shape per DATA_SCHEMAS.md §1 and phase-6i spec. All Ranges preserved.
    n_models = len(co2_list)
    unweighted_co2 = (
        {k: co2_kg[k] / n_models for k in ("low", "mid", "high")}
        if n_models
        else {"low": 0.0, "mid": 0.0, "high": 0.0}
    )
    assumption_sets = _load_alt_assumption_sets()
    rs_report = rank_stability(list(estimates), assumption_sets)
    totals["fairness"] = {
        "rank_stability": rs_report,
        "unweighted": {"co2_kg": unweighted_co2},
    }

    # Phase 6m: indistinguishable tiers (group by overlapping co2_kg {low,high}).
    # Replaces numbered ranks as headline because rank_stability shows per-model
    # ordering is noise under alt assumptions (e.g. ranks_changed 10/10 on real data).
    # tiers lists are slug lists; reversal makes [0] the lowest-impact band = Tier 1.
    tier_groups = indistinguishable_tiers(list(estimates), key="co2_kg")
    totals["tiers"] = [[m["slug"] for m in g] for g in reversed(tier_groups)]

    # Phase 6G provenance: emit the compact registry entries actually referenced by
    # this day's per-figure source_ids, so the artifact is self-describing/traceable.
    sources_registry = load_sources()
    referenced_ids = {m.get("energy_source_id") for m in estimates}
    referenced_ids |= {m.get("grid_source_id") for m in estimates}
    referenced_ids.discard(None)
    sources = compact_sources(referenced_ids, sources_registry)

    doc: dict = {
        "methodology_version": METHODOLOGY_VERSION,
        "generated_at": generated_at,
        "data_date": data_date,
        "source_citation": source_citation,
        "scope_note": scope_note,
        "assumptions": assumptions,
        "sources": sources,
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

    # Phase 6K: OAT sensitivity report (always overwritten; reflects latest run).
    write_sensitivity_json(doc)

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


def write_sensitivity_json(doc: dict) -> None:
    """Phase 6K: run the OAT sweep on this run's models and write sensitivity.json.

    The report always reflects the latest run's model mix (token volumes + energy
    intensity + grid factors). It is a separate artifact from latest.json — it is
    NOT schema-validated against the main output schema (it has its own §8 shape
    in DATA_SCHEMAS.md) and does NOT affect make verify determinism (verify only
    checks history/*.json).
    """
    models: list[dict] = doc.get("models", [])
    data_date: str = doc.get("data_date", "")
    report = oat_sensitivity(models)
    report["data_date"] = data_date
    # Canonical field order per DATA_SCHEMAS.md §8: data_date first, then drivers, dominant.
    ordered: dict = {
        "data_date": report.pop("data_date"),
        "drivers": report["drivers"],
        "dominant": report["dominant"],
    }
    sens_path = config.SENSITIVITY_PATH
    sens_path.parent.mkdir(parents=True, exist_ok=True)
    with open(sens_path, "w", encoding="utf-8") as f:
        json.dump(ordered, f, ensure_ascii=False, indent=2)
        f.write("\n")
    log.info("sensitivity.json written to %s (dominant: %s)", sens_path, ordered.get("dominant"))
