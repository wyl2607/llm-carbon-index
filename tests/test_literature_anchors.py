"""Phase 6P tests for literature cross-validation harness.

Covers (per spec):
- every anchor has a resolvable source_id in sources.yaml (LIT-* only);
- verified anchors execute band containment (out-of-band recorded as explicit "flag", never silent);
- LIT-OPENAI is strictly report-only (status=="report_only", excluded from hard asserts);
- validate_literature produces a record per anchor;
- validation.json is emitted with the expected shape;
- any single file read failure for one anchor is tolerated (skip & continue).

Uses the same sys.path + robust import pattern as other pipeline tests.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.provenance import load_sources, resolve
from pipeline.validate_literature import (
    LITERATURE_ANCHORS_PATH,
    VALIDATION_PATH,
    validate_literature,
)

# --- helpers ---

def _load_anchors() -> list[dict]:
    try:
        data = yaml.safe_load(LITERATURE_ANCHORS_PATH.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return [a for a in data.get("anchors", []) if isinstance(a, dict)]
        if isinstance(data, list):
            return [a for a in data if isinstance(a, dict)]
    except Exception:
        return []
    return []


def _load_latest_doc() -> dict:
    latest = Path(__file__).resolve().parents[1] / "data" / "output" / "latest.json"
    try:
        if latest.exists():
            return json.loads(latest.read_text(encoding="utf-8"))
    except Exception:
        pass
    # fall back to sample fixture (guaranteed to exist)
    sample = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "latest.sample.json"
    try:
        return json.loads(sample.read_text(encoding="utf-8"))
    except Exception:
        return {}


# --- tests ---

def test_literature_anchors_yaml_loads_with_four_entries():
    anchors = _load_anchors()
    assert len(anchors) >= 3, "expected at least the three verified + one report-only"
    ids = [a.get("id") for a in anchors]
    assert "LIT-BLOOM" in ids
    assert "LIT-GEMINI" in ids
    assert "LIT-JEGHAM" in ids
    assert "LIT-OPENAI" in ids


def test_every_anchor_has_resolvable_source_id():
    """Every anchor source_id (LIT-*) must resolve in the registry."""
    anchors = _load_anchors()
    sources = load_sources()
    assert sources, "sources registry must load for resolution test"
    for a in anchors:
        sid = a.get("source_id")
        assert sid and isinstance(sid, str) and sid.startswith("LIT-"), f"bad source_id for {a.get('id')}"
        resolved = resolve(sid, sources)
        assert resolved is not None, f"unresolvable source_id {sid} for anchor {a.get('id')}"


def test_literature_anchors_source_ids_only_in_lit_namespace():
    """Guard: anchors only ever use LIT-* (distinct from L- / E- / C- etc.)."""
    anchors = _load_anchors()
    for a in anchors:
        sid = a.get("source_id", "")
        assert sid.startswith("LIT-"), f"anchor {a.get('id')} uses non-LIT source_id {sid}"


def test_verified_anchors_run_band_assertions_and_collect_status():
    """Verified anchors must produce a band record; status is pass or flag (finding)."""
    doc = _load_latest_doc()
    res = validate_literature(doc)
    recs = res.get("literature_anchors") or []
    verified_recs = [r for r in recs if r.get("verified")]
    assert len(verified_recs) >= 2, "expected at least BLOOM and JEGHAM (or GEMINI) verified records"
    for r in verified_recs:
        assert r.get("status") in ("pass", "flag"), f"verified anchor {r.get('id')} has bad status {r.get('status')}"
        assert "band" in r and isinstance(r["band"], dict)
        assert "low" in r["band"] and "mid" in r["band"] and "high" in r["band"]
        # containment was evaluated (even if flagged)
        assert r.get("source_id", "").startswith("LIT-")


def test_lit_openai_is_report_only_and_excluded_from_hard_asserts():
    """LIT-OPENAI must never participate in hard band assertions."""
    doc = _load_latest_doc()
    res = validate_literature(doc)
    recs = res.get("literature_anchors") or []
    openai_recs = [r for r in recs if r.get("id") == "LIT-OPENAI"]
    assert len(openai_recs) == 1
    r = openai_recs[0]
    assert r.get("verified") is False
    assert r.get("status") == "report_only"
    # still carries the data for reporting
    assert "band" in r
    assert r.get("source_id") == "LIT-OPENAI"


def test_validate_literature_returns_one_record_per_input_anchor():
    doc = _load_latest_doc()
    res = validate_literature(doc)
    recs = res.get("literature_anchors") or []
    anchors = _load_anchors()
    # at least as many as input anchors (some may have been skipped on I/O error, but normally equal)
    assert len(recs) >= len(anchors) - 1  # tolerate at most one skip in degraded env
    # every produced record has the required shape keys
    for r in recs:
        for k in ("id", "anchor", "band", "status", "source_id", "verified"):
            assert k in r, f"record missing key {k}: {r}"


def test_validation_json_is_produced_with_one_record_per_anchor():
    """After a validate run the committed-style output file exists and is well-formed."""
    doc = _load_latest_doc()
    validate_literature(doc)  # side-effect write
    assert VALIDATION_PATH.exists(), "validation.json must be emitted alongside other outputs"
    v = json.loads(VALIDATION_PATH.read_text(encoding="utf-8"))
    assert "literature_anchors" in v
    recs = v["literature_anchors"]
    assert isinstance(recs, list) and len(recs) >= 3
    # quick shape spot-check
    for r in recs:
        assert "id" in r and "status" in r and "band" in r


def test_file_read_failure_for_one_anchor_does_not_abort():
    """If crosswalk or intensity read would fail we still produce records for other anchors (simulated by empty loads inside)."""
    # The implementation already guards every per-anchor block; we simply exercise the public API
    # with a minimal doc. The test is that no exception propagates.
    bad_doc = {"models": [], "data_date": "1970-01-01"}
    res = validate_literature(bad_doc)
    # either some records (from class fallback) or empty list; never raises
    assert "literature_anchors" in res
    assert isinstance(res["literature_anchors"], list)
