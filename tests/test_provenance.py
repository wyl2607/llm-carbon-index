"""Phase 6G tests for pipeline/provenance.py — the "no unsourced number" gate.

Covers: gate detection on a dirty fixture tree, real-repo resolution (no dangling
source_ids), the no-quote (paraphrase length) guard, and compact source emission.
"""
from __future__ import annotations

import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.config import PROVENANCE_GATED_PATHS
from pipeline.provenance import (
    MAX_CLAIM_LEN,
    compact_sources,
    load_sources,
    long_claims,
    resolve,
    scan_repo,
    unsourced_numbers,
)

VALID = {"E-CLASS-LARGE", "C-GRID-EGRID"}


def test_gate_flags_a_number_missing_source_id():
    """A record that owns a number but lacks a resolvable source_id is returned."""
    dirty = [
        {"region": "us-east", "gco2_per_kwh": 380, "source_id": "C-GRID-EGRID"},  # ok
        {"region": "mars-1", "gco2_per_kwh": 999},  # MISSING source_id -> hit
    ]
    hits = unsourced_numbers(dirty, VALID)
    assert hits == ["[1]"]


def test_gate_flags_unresolvable_source_id():
    """A present-but-undefined source_id does not count as resolvable."""
    tree = [{"pue": 1.2, "source_id": "DOES-NOT-EXIST"}]
    assert unsourced_numbers(tree, VALID) == ["[0]"]
    # without a registry constraint, mere presence is enough
    assert unsourced_numbers(tree, None) == []


def test_clean_tree_passes_and_range_leaf_owned_by_parent():
    """A {low,mid,high} Range is owned by its parent record, not checked on its own."""
    clean = [
        {
            "openrouter_slug": "x/y",
            "wh_per_output_token": {"low": 0.001, "mid": 0.002, "high": 0.003},
            "source_id": "E-CLASS-LARGE",
        }
    ]
    assert unsourced_numbers(clean, VALID) == []


def test_source_ids_list_form_is_accepted():
    tree = [{"x": 1, "source_ids": ["E-CLASS-LARGE", "OTHER"]}]
    assert unsourced_numbers(tree, VALID) == []


def test_string_only_record_needs_no_source():
    """Records with no numeric leaves (pure identity) are never flagged."""
    tree = [{"openrouter_slug": "a/b", "origin": "US", "params_b": None}]
    assert unsourced_numbers(tree, VALID) == []


def test_real_repo_has_no_unsourced_numbers():
    """The seeded data tree passes the gate (acceptance criterion)."""
    assert scan_repo() == []


def test_every_seeded_source_id_resolves_no_dangling():
    """Every source_id referenced in gated data resolves to a sources.yaml entry."""
    sources = load_sources()
    assert sources, "registry must load"
    referenced: set[str] = set()
    for p in PROVENANCE_GATED_PATHS:
        tree = yaml.safe_load(Path(p).read_text())
        referenced |= _collect_source_ids(tree)
    assert referenced, "expected at least one source_id in data"
    dangling = sorted(sid for sid in referenced if resolve(sid, sources) is None)
    assert dangling == [], f"dangling source_ids: {dangling}"


def test_no_quote_guard_claims_are_short_paraphrases():
    """Each registry claim is a short paraphrase (discourages pasting source text)."""
    sources = load_sources()
    offenders = long_claims(sources)
    assert offenders == [], f"claims over {MAX_CLAIM_LEN} chars: {offenders}"
    # every entry actually has a claim
    assert all(e.get("claim") for e in sources.values())


def test_compact_sources_only_emits_referenced_and_is_sorted():
    out = compact_sources(["C-GRID-EGRID", "E-CLASS-LARGE", "C-GRID-EGRID"])
    ids = [s["id"] for s in out]
    assert ids == ["C-GRID-EGRID", "E-CLASS-LARGE"]  # deduped + sorted
    for s in out:
        assert set(s.keys()) == {"id", "title", "publisher", "url", "version", "accessed"}


def _collect_source_ids(node: object) -> set[str]:
    found: set[str] = set()
    if isinstance(node, dict):
        sid = node.get("source_id")
        if isinstance(sid, str):
            found.add(sid)
        sids = node.get("source_ids")
        if isinstance(sids, list):
            found.update(s for s in sids if isinstance(s, str))
        for v in node.values():
            found |= _collect_source_ids(v)
    elif isinstance(node, list):
        for item in node:
            found |= _collect_source_ids(item)
    return found
