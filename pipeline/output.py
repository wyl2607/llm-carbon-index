"""Phase 3: assemble and persist the validated latest.json + history copy.

Consumes ModelEstimate list (from estimate) + the full NormalizedRecord list
(for totals incl. the is_other row). All energy/CO2 values remain RangeDicts.
"""
from __future__ import annotations

import json
import logging
import math
from collections.abc import Iterable
from datetime import datetime, timezone

import jsonschema
import yaml

import pipeline.config as config
from pipeline import METHODOLOGY_VERSION
from pipeline.fairness import indistinguishable_tiers, rank_stability
from pipeline.frontier import annotate_models, compute_fleet_rightsizing
from pipeline.precision import energy_tier, grid_tier, precision_fractions
from pipeline.provenance import compact_sources, load_sources
from pipeline.sensitivity import oat_sensitivity
from pipeline.slugs import normalize_slug
from pipeline.types import ModelEstimate, NormalizedRecord


# L3: history index helpers — keep timeseries rebuild cheap for multi-year daily cadence.
# Full per-day history/*.json (with models[]) are kept indefinitely for verify/audit.
# index.json stores only the lightweight per-date "totals" excerpts (same shape as
# timeseries entries). write_timeseries prefers it; falls back to full scan if absent.
def _history_index_path():
    """Derive index path from (possibly monkeypatched) OUTPUT_HISTORY_DIR at call time.
    Critical: tests patch OUTPUT_HISTORY_DIR to tmp; precomputed module attr at config
    import time would otherwise point at real data/ and dirty it on pytest.
    """
    hdir = getattr(config, "OUTPUT_HISTORY_DIR", None)
    if hdir is None:
        # fallback (should not happen)
        hdir = config.REPO_ROOT / "data" / "output" / "history"
    return hdir / "index.json"


def _load_history_index() -> list[dict]:
    """Load compact index if present; [] on missing or parse failure."""
    p = _history_index_path()
    if not p.exists():
        return []
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return data
    except Exception:  # noqa: S110 - same fallback pattern as grid.py / snapshot.py
        pass
    return []


def _write_history_index(entries: list[dict]) -> None:
    """Write the index list deterministically (sorted by data_date)."""
    p = _history_index_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    # stable order: chronological
    ordered = sorted(
        [e for e in entries if isinstance(e, dict) and "data_date" in e],
        key=lambda e: e.get("data_date", ""),
    )
    with open(p, "w", encoding="utf-8") as f:
        json.dump(ordered, f, ensure_ascii=False, indent=2)
        f.write("\n")


def update_history_index(data_date: str, totals: dict) -> None:
    """Insert or replace the entry for data_date and persist index.
    Called after every history write so index stays in sync with committed goldens.
    """
    entries = _load_history_index()
    entries = [e for e in entries if e.get("data_date") != data_date]
    entries.append({"data_date": data_date, "totals": totals})
    _write_history_index(entries)

log = logging.getLogger(__name__)


def _load_capability() -> tuple[dict, str | None, str | None]:
    """I/O boundary: load data/model_capability.yaml (Phase 6M frontier X axis).

    Returns (models_map, capability_index_version, capability_index_accessed). The
    version/accessed describe the pinned snapshot (from the first sources[] entry).
    Fail-safe: missing/unreadable -> ({}, None, None) so the rest of the pipeline
    proceeds with every model FALLBACK_CAPABILITY rather than aborting.
    """
    p = config.CAPABILITY_PATH
    try:
        with open(p, encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        models = data.get("models")
        models = models if isinstance(models, dict) else {}
        version = accessed = None
        srcs = data.get("sources")
        if isinstance(srcs, list) and srcs and isinstance(srcs[0], dict):
            s0 = srcs[0]
            version = (f"{s0.get('title', '')} {s0.get('version', '')}".strip()) or None
            accessed = s0.get("accessed")
        return ({k: v for k, v in models.items() if isinstance(v, dict)}, version, accessed)
    except Exception:  # noqa: S110 - deliberate fallback (mirrors _load_alt_assumption_sets)
        return ({}, None, None)


def _load_capability_keys() -> dict[str, str]:
    """I/O boundary: map normalized OpenRouter slug -> capability_key from the crosswalk.

    Fail-safe: missing/unreadable -> {} (everything falls back to FALLBACK_CAPABILITY).
    """
    out: dict[str, str] = {}
    try:
        with open(config.CROSSWALK_PATH, encoding="utf-8") as f:
            cw = yaml.safe_load(f) or []
        if isinstance(cw, list):
            for e in cw:
                if isinstance(e, dict) and e.get("capability_key") and e.get("openrouter_slug"):
                    out[normalize_slug(e["openrouter_slug"])] = e["capability_key"]
    except Exception:  # noqa: S110 - deliberate fallback (mirrors _load_alt_assumption_sets)
        out = {}
    return out


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
        # Conservative perfect-correlation envelope: low+low, high+high. The dominant
        # uncertainties (PUE, energy class, grid factor) are SHARED systematic
        # assumptions applied identically to every model, so their errors add
        # coherently — the linear endpoint sum is the honest headline band, not an
        # accident. See _sum_co2_independent for the narrower independent-error view
        # and docs/methodology.md (Aggregation of uncertainty).
        rs = list(rs)
        if not rs:
            return {"low": 0.0, "mid": 0.0, "high": 0.0}
        return {
            "low": sum(float(r["low"]) for r in rs),
            "mid": sum(float(r["mid"]) for r in rs),
            "high": sum(float(r["high"]) for r in rs),
        }

    def _sum_co2_independent(rs: Iterable[dict]) -> dict:
        """Aggregate band assuming per-model errors are statistically INDEPENDENT.

        Mid is identical to the correlated sum; the half-widths combine in
        quadrature (sqrt of sum of squares) instead of linearly, so independent
        errors partially cancel and the band is NARROWER. Reality lies between this
        and the conservative _sum_co2 envelope; latest.json reports both so the
        headline (co2_kg) is not mistaken for the only defensible interpretation.
        """
        rs = list(rs)
        if not rs:
            return {"low": 0.0, "mid": 0.0, "high": 0.0}
        mid = sum(float(r["mid"]) for r in rs)
        lo_var = sum((float(r["mid"]) - float(r["low"])) ** 2 for r in rs)
        hi_var = sum((float(r["high"]) - float(r["mid"])) ** 2 for r in rs)
        return {
            "low": mid - math.sqrt(lo_var),
            "mid": mid,
            "high": mid + math.sqrt(hi_var),
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
    co2_kg_independent = _sum_co2_independent(co2_list)

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
        "co2_kg_independent": co2_kg_independent,
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

    # Phase 6M efficiency frontier / rightsizing. Derive the intensity axis
    # (energy_wh_per_mtok = wh_per_output_token * 1e6, band carried), join the cited
    # capability score (via the crosswalk capability_key), then annotate each model
    # with on_frontier / rightsizing_gap_pct / avoidable_co2_kg and roll up the fleet
    # headline. Region/grid/PUE are held constant (model-rightsizing lever only).
    cap_models, cap_version, cap_accessed = _load_capability()
    cap_keys = _load_capability_keys()
    frontier_input: list[dict] = []
    for m in estimates:
        wh = m.get("wh_per_output_token") or {}
        key = cap_keys.get(normalize_slug(m["slug"]))
        entry = cap_models.get(key) if key else None
        cap_index = entry.get("capability_index") if entry else None
        fm = dict(m)
        fm["energy_wh_per_mtok"] = {x: float(wh.get(x, 0.0)) * 1e6 for x in ("low", "mid", "high")}
        fm["capability_index"] = cap_index
        fm["capability_source_id"] = (
            entry.get("source_id") if (entry and cap_index is not None) else None
        )
        frontier_input.append(fm)

    models_out = annotate_models(frontier_input)
    fleet_rightsizing = compute_fleet_rightsizing(
        frontier_input,
        capability_index_version=cap_version,
        capability_index_accessed=cap_accessed,
    )

    doc: dict = {
        "methodology_version": METHODOLOGY_VERSION,
        "generated_at": generated_at,
        "data_date": data_date,
        "source_citation": source_citation,
        "scope_note": scope_note,
        "assumptions": assumptions,
        "sources": sources,
        "models": models_out,
        "totals": totals,
        "fleet_rightsizing": fleet_rightsizing,
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

    # L3: maintain compact index for cheap long-term rebuilds (full files kept)
    update_history_index(data_date, doc.get("totals", {}))

    # Generate timeseries (prefers index when present)
    write_timeseries()

    # Phase 6K: OAT sensitivity report (always overwritten; reflects latest run).
    write_sensitivity_json(doc)

    # P7: ESG/CSRD Scope-2 dual-reporting export (after history snapshot, per spec)
    write_esg_export(doc)

def write_timeseries() -> None:
    """Aggregate per-day totals into timeseries.json.
    L3: prefer compact history/index.json (cheap, no full models[] parse).
    Falls back to glob+extract of history/*.json for backward compat or when
    index is absent. Rebuild remains correct and produces identical shape.
    """
    hist_dir = config.OUTPUT_HISTORY_DIR
    if not hist_dir.exists():
        return

    index_path = _history_index_path()
    timeseries: list[dict] = []
    if index_path.exists():
        try:
            loaded = json.loads(index_path.read_text(encoding="utf-8"))
            if isinstance(loaded, list):
                # keep only well-formed entries; preserve order from index (we keep it sorted)
                timeseries = [
                    {"data_date": e["data_date"], "totals": e["totals"]}
                    for e in loaded
                    if isinstance(e, dict) and "data_date" in e and "totals" in e
                ]
        except Exception:  # noqa: S110 - fallback to scan on corrupt index (consistent with project)
            timeseries = []

    if not timeseries:
        # fallback: full scan (for legacy trees without index yet)
        for hist_file in sorted(hist_dir.glob("*.json")):
            # skip the index itself if it somehow matched glob in odd layout
            if hist_file.name == "index.json":
                continue
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


# L3 retention/index test helper (new logic for update_history_index / write_timeseries index path).
# Not collected by pytest (testpaths=tests) but provides explicit test coverage for the
# retention/index function. Invoke directly:
#   uv run python -c "
#     from pipeline.output import _test_history_index; import tempfile; from pathlib import Path
#     with tempfile.TemporaryDirectory() as td: _test_history_index(Path(td))
#   "
def _test_history_index(tmp_root: object) -> bool:  # object avoids ruff undefined in str-annot
    """Minimal self-contained test for the L3 index functions using a tmp tree.
    Returns True on pass. Mutates only under tmp_root (never real data/).
    """
    # simulate patched config paths under tmp (derive from DIR so test patching matches reality)
    fake_hist = tmp_root / "history"
    fake_idx = fake_hist / "index.json"
    orig_dir = config.OUTPUT_HISTORY_DIR
    orig_ts = config.OUTPUT_TIMESERIES_PATH
    try:
        config.OUTPUT_HISTORY_DIR = fake_hist
        # first write
        t1 = {"total_tokens": 1, "co2_kg": {"low": 0, "mid": 0, "high": 0}}
        update_history_index("2026-06-10", t1)
        assert fake_idx.exists(), "index not written"  # noqa: S101
        idx = json.loads(fake_idx.read_text(encoding="utf-8"))
        assert len(idx) == 1 and idx[0]["data_date"] == "2026-06-10"  # noqa: S101
        # replace + add second
        t2 = {"total_tokens": 2, "co2_kg": {"low": 1, "mid": 1, "high": 1}}
        update_history_index("2026-06-11", t2)
        update_history_index("2026-06-10", t1)  # idempotent replace
        idx2 = json.loads(fake_idx.read_text(encoding="utf-8"))
        assert len(idx2) == 2  # noqa: S101
        dates = [e["data_date"] for e in idx2]
        assert dates == ["2026-06-10", "2026-06-11"]  # noqa: S101
        # write_timeseries path using index (must pick index because present)
        ts_path = tmp_root / "timeseries.json"
        config.OUTPUT_TIMESERIES_PATH = ts_path
        write_timeseries()
        ts = json.loads(ts_path.read_text(encoding="utf-8"))
        assert len(ts) == 2 and ts[0]["data_date"] == "2026-06-10"  # noqa: S101
        return True
    finally:
        config.OUTPUT_HISTORY_DIR = orig_dir
        config.OUTPUT_TIMESERIES_PATH = orig_ts


# --- P7: ESG/CSRD Scope-2 dual-reporting export (non-editable scope statement) ---

SCOPE_CAVEAT: str = (
    "This project estimates the CO₂ footprint of OpenRouter-visible LLM inference — "
    "a representative but partial slice of global AI usage. It is NOT a "
    "measurement of total global data-center emissions. All figures are estimates "
    "with uncertainty ranges, not measurements."
)


def write_esg_export(doc: dict) -> None:
    """Write data/output/esg_export.json mapping location-based + market-based to
    GHG Protocol Scope 2 dual reporting + ESRS-E1 flavored line item.

    Reuses *exactly* totals.co2_kg (location) and totals.co2_kg_market (market) as
    {low,mid,high} ranges. No new numbers fabricated. The SCOPE_CAVEAT (project
    scope statement) is embedded verbatim and is non-removable.

    If any supporting read would fail, SKIP and continue (never aborts the
    primary write_outputs path).
    """
    try:
        totals: dict = doc.get("totals") or {}
        loc = totals.get("co2_kg") or {"low": 0.0, "mid": 0.0, "high": 0.0}
        mkt = totals.get("co2_kg_market") or loc
        data_date: str = doc.get("data_date", "")
        methodology_version: str = doc.get("methodology_version", "")

        def _rng(r: dict) -> dict:
            return {
                "low": float(r.get("low", 0.0)),
                "mid": float(r.get("mid", 0.0)),
                "high": float(r.get("high", 0.0)),
            }

        esg_doc: dict = {
            "data_date": data_date,
            "methodology_version": methodology_version,
            "scope_caveat": SCOPE_CAVEAT,
            "scope_2": {
                "location_based": _rng(loc),
                "market_based": _rng(mkt),
            },
            "esrs_e1": {
                "standard": "ESRS E1 Climate Change",
                "disclosure": "E1-6 Gross Scopes 1, 2, 3 and Total GHG emissions",
                "line_item": (
                    "Scope 2 purchased energy (location-based vs market-based) — estimated "
                    "from OpenRouter-visible LLM inference traffic (proxy for Scope 3 "
                    "Category 1 purchased services)"
                ),
                "location_based_kgco2e": _rng(loc),
                "market_based_kgco2e": _rng(mkt),
                "modeled_traffic_fraction": float(totals.get("modeled_traffic_fraction", 0.0)),
                "note": (
                    "Ranges carried end-to-end from totals; no collapse to point values. "
                    "Dual reporting follows GHG Protocol Scope 2. Scale by "
                    "modeled_traffic_fraction for full inventory. Full uncertainty and "
                    "partial-coverage statement is in scope_caveat (non-removable)."
                ),
            },
            "source_citation": doc.get("source_citation", ""),
        }

        esg_path = config.OUTPUT_DIR / "esg_export.json"
        esg_path.parent.mkdir(parents=True, exist_ok=True)
        with open(esg_path, "w", encoding="utf-8") as f:
            json.dump(esg_doc, f, ensure_ascii=False, indent=2)
            f.write("\n")
        log.info("esg_export.json written to %s (date=%s)", esg_path, data_date)
    except Exception:  # noqa: S110 - deliberate: if read or write of esg fails, skip and continue per spec
        log.warning(
            "esg_export write skipped (read or write path failed); primary outputs unaffected"
        )
