"""Phase 6P: literature cross-validation harness.

Checks project's estimate bands (wh_per_output_token scaled to per-query) against
published literature anchors. Emits data/output/validation.json for consumption
by tests and future reporting.

- Every anchor has source_id (LIT-*) resolved in test.
- verified:true anchors perform band containment (low <= lit_mid <= high); out-of-band
  is recorded as status="flag" (finding to surface, not test failure).
- verified:false (LIT-OPENAI) is report-only: status="report_only", excluded from asserts.
- All file reads are robust: any single failure skips only the affected anchor or
  falls back; never aborts the whole validation.
- Uses pipeline.ranges.Range for band math (conservative endpoint propagation).
- model_match selects from doc["models"] via crosswalk params/family; falls back to
  parameter_class_fallback class band when no exact large/dense match present.

Public: validate_literature(doc: dict | None = None) -> dict
Side effect: writes data/output/validation.json (alongside other outputs).
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

# Make importable when run as script or pytest from repo root (consistent with other tests)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.config import OUTPUT_DIR
from pipeline.ranges import Range
from pipeline.slugs import normalize_slug

# Local paths (robust; not added to provenance gate per scope)
LITERATURE_ANCHORS_PATH = Path(__file__).resolve().parents[1] / "data" / "validation" / "literature_anchors.yaml"
CROSSWALK_PATH = Path(__file__).resolve().parents[1] / "data" / "crosswalk" / "model_crosswalk.yaml"
INTENSITY_PATH = Path(__file__).resolve().parents[1] / "data" / "energy" / "intensity.yaml"
LATEST_PATH = OUTPUT_DIR / "latest.json"
VALIDATION_PATH = OUTPUT_DIR / "validation.json"


def _load_yaml_list_robust(path: Path) -> list[dict]:
    """Load list-yaml with full exception tolerance (per hard rule: skip, never abort).
    Supports both top-level list and {"anchors": [...]} wrapper (used by literature file).
    """
    try:
        if not path.exists():
            return []
        with open(path, encoding="utf-8") as f:
            loaded = yaml.safe_load(f)
            if isinstance(loaded, list):
                return [e for e in loaded if isinstance(e, dict)]
            if isinstance(loaded, dict):
                inner = loaded.get("anchors")
                if isinstance(inner, list):
                    return [e for e in inner if isinstance(e, dict)]
    except Exception:
        pass
    return []


def _load_yaml_dict_robust(path: Path) -> dict:
    """Load dict-yaml with full exception tolerance."""
    try:
        if not path.exists():
            return {}
        with open(path, encoding="utf-8") as f:
            loaded = yaml.safe_load(f)
            if isinstance(loaded, dict):
                return loaded
    except Exception:
        pass
    return {}


def _load_doc_robust(doc: dict | None) -> dict:
    """Return provided doc or load latest.json robustly."""
    if isinstance(doc, dict) and doc:
        return doc
    try:
        if LATEST_PATH.exists():
            with open(LATEST_PATH, encoding="utf-8") as f:
                loaded = json.load(f)
                if isinstance(loaded, dict):
                    return loaded
    except Exception:
        pass
    return {}


def _load_sources_for_test() -> dict[str, dict]:
    """Lightweight sources loader for the resolvable-source test (not for gate)."""
    prov_path = Path(__file__).resolve().parents[1] / "data" / "provenance" / "sources.yaml"
    try:
        items = _load_yaml_list_robust(prov_path)
        return {e["id"]: e for e in items if isinstance(e, dict) and e.get("id")}
    except Exception:
        return {}


def _resolve_source_id(sid: str, sources: dict[str, dict]) -> bool:
    return bool(sid) and sid in sources


def _get_cw_map(crosswalk: list[dict]) -> dict[str, dict]:
    m: dict[str, dict] = {}
    for e in crosswalk or []:
        slug = e.get("openrouter_slug")
        if slug:
            m[normalize_slug(slug)] = e
    return m


def _get_intensity_class_band(intensity: dict, min_active: int = 30) -> dict | None:
    """Pick the parameter_class_fallback band (prefer large for >=30B)."""
    bands = (intensity or {}).get("parameter_class_fallback", []) or []
    if not bands:
        return None
    # conservative: largest max_active
    try:
        return max(bands, key=lambda b: int(b.get("max_active_params_b") or 0))
    except Exception:
        return bands[0] if bands else None


def _select_matching_models(
    anchor: dict, doc_models: list[dict], cw_map: dict[str, dict]
) -> list[dict]:
    """Return list of model rows from doc that satisfy model_match (may be empty)."""
    match = anchor.get("model_match") or {}
    params_gte: int | None = match.get("params_b_gte")
    params_lte: int | None = match.get("params_b_lte")
    want_dense: bool | None = match.get("dense")
    family: str | None = match.get("family")

    selected: list[dict] = []
    for m in doc_models or []:
        slug = m.get("slug") or ""
        nslug = normalize_slug(slug)
        cw = cw_map.get(nslug, {})
        params = cw.get("params_b")
        active = cw.get("active_params_b")
        ok = True
        if params_gte is not None:
            if params is None or int(params) < int(params_gte):
                ok = False
        if params_lte is not None and ok:
            if params is None or int(params) > int(params_lte):
                ok = False
        if want_dense and ok:
            # dense if active approx equals params (within 80%+)
            if params is None or active is None:
                ok = False
            else:
                try:
                    if float(active) < float(params) * 0.8:
                        ok = False
                except Exception:
                    ok = False
        if family and ok:
            fl = family.lower()
            if fl not in nslug.lower() and fl not in (m.get("display_name") or "").lower():
                ok = False
        if ok:
            selected.append(m)
    return selected


def _derive_wh_per_query_band(
    wh_range: Range, query_output_tokens: float
) -> Range:
    """Scale output-token band to per-query using literature query definition."""
    if query_output_tokens <= 0:
        query_output_tokens = 500.0
    return wh_range * float(query_output_tokens)


def _derive_co2_g_per_query_band(
    wh_per_q: Range, pue: float, gco2_per_kwh: float
) -> Range:
    """co2_g_per_q = (wh_per_q / 1000) * pue * gco2_per_kwh   [from co2_kg = kwh * pue * g / 1000]"""
    kwh_q = wh_per_q / 1000.0
    pue_r = float(pue) if pue else 1.25
    g = float(gco2_per_kwh) if gco2_per_kwh else 400.0
    # kwh_q * pue * g   => grams (since co2_g = energy_kwh * pue * gco2 )
    co2_g = kwh_q * pue_r * g
    return co2_g


def validate_literature(doc: dict | None = None) -> dict:
    """Core entrypoint. Returns validation report dict; writes validation.json as side effect.

    If reading anchors/crosswalk/doc/intensity fails for a given anchor, that anchor
    is skipped (status omitted for it) and processing continues.
    """
    doc = _load_doc_robust(doc)
    models: list[dict] = doc.get("models", []) if isinstance(doc.get("models"), list) else []

    anchors_raw = _load_yaml_list_robust(LITERATURE_ANCHORS_PATH)
    crosswalk = _load_yaml_list_robust(CROSSWALK_PATH)
    intensity = _load_yaml_dict_robust(INTENSITY_PATH)
    cw_map = _get_cw_map(crosswalk)

    sources = _load_sources_for_test()  # for optional internal use; real checks in test

    results: list[dict] = []
    for a in anchors_raw:
        try:
            aid = a.get("id")
            src = a.get("source_id")
            verified = bool(a.get("verified", True))
            metric = a.get("metric", "wh_per_query")
            qtok = float(a.get("query_output_tokens") or 500.0)
            val = a.get("value") or {}
            lit_mid = float(val.get("mid", 0.0))

            # select models or fallback class band
            matched = _select_matching_models(a, models, cw_map)
            wh_r: Range | None = None
            rep_pue = 1.25
            rep_gco2 = 400.0
            used_source = "class_fallback"
            if matched:
                # use first matched row's wh band (they share class in practice)
                m0 = matched[0]
                whd = m0.get("wh_per_output_token") or {}
                wh_r = Range(
                    float(whd.get("low", 0.0005)),
                    float(whd.get("mid", 0.001)),
                    float(whd.get("high", 0.0025)),
                )
                rep_pue = float(m0.get("pue") or 1.25)
                rep_gco2 = float(m0.get("carbon_intensity_gco2_kwh") or 400.0)
                used_source = m0.get("slug", "matched")
            else:
                # fallback to intensity class band based on match hint
                band = _get_intensity_class_band(intensity)
                if band:
                    whd = band.get("wh_per_output_token") or {}
                    wh_r = Range(
                        float(whd.get("low", 0.002)),
                        float(whd.get("mid", 0.005)),
                        float(whd.get("high", 0.012)),
                    )
                    used_source = band.get("source_id", "E-CLASS-LARGE")
                else:
                    # ultimate safe documented fallback (still produces a band)
                    wh_r = Range(0.002, 0.005, 0.012)

            band = _derive_wh_per_query_band(wh_r, qtok)

            # co2 if present in anchor
            co2_lit = None
            co2_band = None
            c = a.get("co2_g_per_query") or {}
            if "mid" in c:
                try:
                    co2_lit = float(c["mid"])
                    co2_band = _derive_co2_g_per_query_band(band, rep_pue, rep_gco2)
                except Exception:
                    co2_lit = None
                    co2_band = None

            # containment check (on wh mid)
            if band.low <= lit_mid <= band.high:
                status = "pass"
            else:
                status = "flag"

            if not verified:
                status = "report_only"

            rec: dict[str, Any] = {
                "id": aid,
                "anchor": {
                    "metric": metric,
                    "value": val,
                    "co2_g_per_query": (a.get("co2_g_per_query") if co2_lit is not None else None),
                },
                "band": band.to_dict(),
                "status": status,
                "source_id": src,
                "verified": verified,
                "used": {"source": used_source, "pue": rep_pue, "gco2_kwh": rep_gco2, "query_output_tokens": qtok},
                "note": a.get("note"),
            }
            if co2_band is not None:
                rec["co2_band"] = co2_band.to_dict()
            results.append(rec)
        except Exception:
            # per-anchor failure: SKIP this anchor, continue
            continue

    out: dict[str, Any] = {
        "methodology_version": doc.get("methodology_version", "0.6.0"),
        "data_date": doc.get("data_date"),
        "literature_anchors": results,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    # Emit alongside other outputs (robust write; failure does not raise to caller)
    try:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        with open(VALIDATION_PATH, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2, ensure_ascii=False)
    except Exception:
        pass

    return out


if __name__ == "__main__":
    res = validate_literature(None)
    print(json.dumps(res, indent=2, ensure_ascii=False))
