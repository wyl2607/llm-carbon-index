"""Tests for the efficiency-frontier / rightsizing feature (spec: specs/efficiency-frontier.md).

These tests are written FIRST and define the contract for `pipeline/frontier.py`.
They will fail to import until that module exists — that is intentional (TDD).

Expected public API in `pipeline/frontier.py`
---------------------------------------------
    compute_frontier(models: list[dict]) -> set[str]
        Slugs of models on the HIGH-CONFIDENCE Pareto frontier.
        Eligible to DEFINE the frontier iff:
            energy_source == "ai_energy_score"  AND  capability_index is not None
        Pareto rule, capability ↑ better / intensity ↓ better (intensity = energy_wh_per_mtok["mid"]):
            M is on the frontier iff no eligible N has
                capability_N >= capability_M AND intensity_N <= intensity_M  (one strict).

    annotate_models(models: list[dict]) -> list[dict]
        Returns models enriched with: on_frontier, frontier_reference_slug,
        rightsizing_gap_pct ({low,mid,high} | None), avoidable_co2_kg ({low,mid,high} | None),
        and APPENDED flags. Must not drop pre-existing flags. Must not mutate inputs.

    compute_fleet_rightsizing(models: list[dict], include_low_confidence: bool = False) -> dict
        Returns the top-level `fleet_rightsizing` summary block. Internally annotates.

Reference selection (per model M with capability c_M, mid-intensity e_M)
------------------------------------------------------------------------
    F = frontier model with MIN mid-intensity among frontier models with capability >= c_M.
    - M itself on frontier  -> gap == {0,0,0}, on_frontier True, flag ON_FRONTIER.
    - no F with capability >= c_M (M is most capable) -> gap None, flag NO_FRONTIER_REFERENCE.
    - F exists but e_F >= e_M (M already at/under frontier for its tier) -> gap == {0,0,0}, no reference.
    - capability_index is None -> gap None, flag FALLBACK_CAPABILITY (excluded from frontier set).
    - energy_source == "parameter_class_fallback" -> gap computed vs high-conf frontier,
      flag LOW_CONFIDENCE_GAP, EXCLUDED from frontier set and from the default fleet headline.

Gap band (clamp negatives at 0)
-------------------------------
    gap_mid  = (e_M.mid  - e_F.mid ) / e_M.mid
    gap_low  = max(0, (e_M.low  - e_F.high) / e_M.low )
    gap_high =        (e_M.high - e_F.low ) / e_M.high

Avoidable CO2 (supersedes spec §5 token formula — unit-safe; co2_kg is operational location-based)
---------------------------------------------------------------------------------------------------
    avoidable_co2_kg.x = co2_kg.x * gap_pct.x   for x in {low, mid, high}
"""

import copy
import sys
from pathlib import Path

import pytest

# Make local pipeline package importable when running pytest from repo root
# (matches pattern used by the rest of tests/).
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.frontier import (  # noqa: E402  (import-fails-until-implemented is expected)
    annotate_models,
    compute_fleet_rightsizing,
    compute_frontier,
)

AI = "ai_energy_score"
FALLBACK = "parameter_class_fallback"


def make_model(slug, cap, intensity, co2, energy_source=AI, flags=None):
    """intensity / co2 are (low, mid, high) tuples."""
    return {
        "slug": slug,
        "capability_index": cap,
        "energy_source": energy_source,
        "energy_wh_per_mtok": {"low": intensity[0], "mid": intensity[1], "high": intensity[2]},
        "co2_kg": {"low": co2[0], "mid": co2[1], "high": co2[2]},
        "flags": list(flags) if flags else [],
    }


@pytest.fixture
def models():
    """Hand-verifiable plane.

    High-confidence (ai_energy_score, capability present):
        A eff-small     cap40  int.mid 2000   -> frontier
        E mid-lean      cap45  int.mid 3000   -> frontier
        B flagship-lean cap55  int.mid 5000   -> frontier
        C flagship-heavy cap55 int.mid 8000   -> DOMINATED by B (same cap, more intensity)
        D frontier-top  cap60  int.mid 12000  -> frontier (most capable; no reference)
    Low-confidence (fallback): F_lc cap55 int.mid 9000 -> excluded from frontier def.
    No capability:            G    cap None int.mid 6000 -> excluded from frontier def.

    Frontier set = {A, E, B, D}. Only C carries a high-confidence non-zero gap (ref = B).
    """
    return [
        make_model("eff-small",      40, (1500, 2000, 3000),  (10000, 15000, 22000)),
        make_model("mid-lean",       45, (2200, 3000, 4500),  (15000, 22000, 33000)),
        make_model("flagship-lean",  55, (4000, 5000, 6500),  (30000, 40000, 55000)),
        make_model("flagship-heavy", 55, (6000, 8000, 11000), (50000, 90000, 160000)),
        make_model("frontier-top",   60, (9000, 12000, 18000),(70000, 110000, 170000)),
        make_model("heavy-fallback", 55, (7000, 9000, 13000), (40000, 70000, 120000),
                   energy_source=FALLBACK),
        make_model("unknown-cap",    None, (5000, 6000, 8000),(25000, 35000, 50000)),
    ]


def by_slug(annotated):
    return {m["slug"]: m for m in annotated}


# --------------------------------------------------------------------------- frontier

class TestFrontier:
    def test_membership(self, models):
        assert compute_frontier(models) == {"eff-small", "mid-lean", "flagship-lean", "frontier-top"}

    def test_dominated_model_excluded(self, models):
        # flagship-heavy: same capability as flagship-lean but higher intensity -> dominated.
        assert "flagship-heavy" not in compute_frontier(models)

    def test_fallback_energy_never_defines_frontier(self, models):
        assert "heavy-fallback" not in compute_frontier(models)

    def test_missing_capability_never_defines_frontier(self, models):
        assert "unknown-cap" not in compute_frontier(models)

    def test_inputs_not_mutated(self, models):
        snapshot = copy.deepcopy(models)
        compute_frontier(models)
        annotate_models(models)
        assert models == snapshot


# --------------------------------------------------------------------------- gaps

class TestGap:
    def test_frontier_members_have_zero_gap(self, models):
        m = by_slug(annotate_models(models))
        for slug in ("eff-small", "mid-lean", "flagship-lean"):
            assert m[slug]["on_frontier"] is True
            assert m[slug]["rightsizing_gap_pct"] == {"low": 0, "mid": 0, "high": 0}

    def test_dominated_model_gap_and_reference(self, models):
        c = by_slug(annotate_models(models))["flagship-heavy"]
        assert c["on_frontier"] is False
        assert c["frontier_reference_slug"] == "flagship-lean"
        assert c["rightsizing_gap_pct"]["mid"] == pytest.approx((8000 - 5000) / 8000)      # 0.375
        assert c["rightsizing_gap_pct"]["high"] == pytest.approx((11000 - 4000) / 11000)   # 0.6364
        assert c["rightsizing_gap_pct"]["low"] == 0  # (6000 - 6500)/6000 -> clamped

    def test_most_capable_model_has_no_reference(self, models):
        d = by_slug(annotate_models(models))["frontier-top"]
        assert d["rightsizing_gap_pct"] is None
        assert d["frontier_reference_slug"] is None
        assert "NO_FRONTIER_REFERENCE" in d["flags"]

    def test_missing_capability_has_no_gap(self, models):
        g = by_slug(annotate_models(models))["unknown-cap"]
        assert g["rightsizing_gap_pct"] is None
        assert "FALLBACK_CAPABILITY" in g["flags"]


# --------------------------------------------------------------------------- flags

class TestFlags:
    def test_frontier_flag_set(self, models):
        m = by_slug(annotate_models(models))
        assert "ON_FRONTIER" in m["flagship-lean"]["flags"]
        assert "ON_FRONTIER" not in m["flagship-heavy"]["flags"]

    def test_low_confidence_flag(self, models):
        f = by_slug(annotate_models(models))["heavy-fallback"]
        assert "LOW_CONFIDENCE_GAP" in f["flags"]
        # gap is still computed, against the high-confidence frontier (ref = flagship-lean).
        assert f["frontier_reference_slug"] == "flagship-lean"
        assert f["rightsizing_gap_pct"]["mid"] == pytest.approx((9000 - 5000) / 9000)  # 0.4444

    def test_preexisting_flags_preserved(self):
        m = make_model("x", 55, (6000, 8000, 11000), (50000, 90000, 160000),
                       flags=["FALLBACK_GRID_ANNUAL", "CLOSED_MODEL_ASSUMED"])
        # x alone is the only model -> it is its own frontier, gap 0, ON_FRONTIER appended.
        out = annotate_models([m])[0]
        assert "FALLBACK_GRID_ANNUAL" in out["flags"]
        assert "CLOSED_MODEL_ASSUMED" in out["flags"]
        assert "ON_FRONTIER" in out["flags"]


# --------------------------------------------------------------------------- bands

class TestBands:
    def test_band_ordering_and_clamp(self, models):
        for m in annotate_models(models):
            gap = m["rightsizing_gap_pct"]
            if gap is None:
                continue
            assert gap["low"] >= 0
            assert gap["low"] <= gap["mid"] <= gap["high"]

    def test_avoidable_matches_gap_times_co2(self, models):
        c = by_slug(annotate_models(models))["flagship-heavy"]
        gap = c["rightsizing_gap_pct"]
        av = c["avoidable_co2_kg"]
        assert av["mid"] == pytest.approx(90000 * gap["mid"])    # 33750
        assert av["high"] == pytest.approx(160000 * gap["high"])  # ~101818
        assert av["low"] == pytest.approx(50000 * gap["low"])     # 0


# --------------------------------------------------------------------------- fleet

class TestFleet:
    def test_headline_excludes_low_confidence_by_default(self, models):
        fleet = compute_fleet_rightsizing(models)
        # Only flagship-heavy contributes a high-confidence non-zero gap.
        assert fleet["avoidable_co2_kg"]["mid"] == pytest.approx(90000 * (3000 / 8000))  # 33750
        assert fleet["avoidable_co2_kg"]["low"] == 0
        assert fleet["models_included"] == 1
        assert fleet["models_excluded_low_confidence"] >= 1

    def test_pct_of_total(self, models):
        fleet = compute_fleet_rightsizing(models)
        total_mid = 15000 + 22000 + 40000 + 90000 + 110000 + 70000 + 35000  # 382000
        assert fleet["avoidable_pct_of_total"]["mid"] == pytest.approx(33750 / total_mid)
        assert fleet["avoidable_pct_of_total"]["low"] == 0
        p = fleet["avoidable_pct_of_total"]
        assert 0 <= p["low"] <= p["mid"] <= p["high"]

    def test_including_low_confidence_increases_avoidable(self, models):
        base = compute_fleet_rightsizing(models)["avoidable_co2_kg"]["mid"]
        incl = compute_fleet_rightsizing(models, include_low_confidence=True)["avoidable_co2_kg"]["mid"]
        # heavy-fallback adds 70000 * (4000/9000) ~= 31111
        assert incl > base
        assert incl == pytest.approx(base + 70000 * (4000 / 9000))

    def test_fleet_sum_equals_sum_of_included(self, models):
        fleet = compute_fleet_rightsizing(models)
        annotated = annotate_models(models)
        frontier = compute_frontier(models)
        included = [
            m for m in annotated
            if m["energy_source"] == AI
            and m["rightsizing_gap_pct"] is not None
            and m["slug"] not in frontier
        ]
        expected_mid = sum(m["avoidable_co2_kg"]["mid"] for m in included)
        assert fleet["avoidable_co2_kg"]["mid"] == pytest.approx(expected_mid)


# --------------------------------------------------------------------------- edge cases

class TestEdgeCases:
    def test_single_model_is_its_own_frontier(self):
        m = make_model("solo", 50, (3000, 4000, 5000), (20000, 30000, 40000))
        out = annotate_models([m])[0]
        assert out["on_frontier"] is True
        assert out["rightsizing_gap_pct"] == {"low": 0, "mid": 0, "high": 0}

    def test_low_confidence_below_frontier_has_zero_gap(self):
        # A fallback model that is MORE efficient than the high-conf frontier at its tier:
        # no rightsizing opportunity -> gap 0, no reference, still flagged low-confidence.
        hi = make_model("hi", 55, (4000, 5000, 6500), (30000, 40000, 55000))
        lc = make_model("lc", 55, (1000, 1500, 2000), (8000, 10000, 13000), energy_source=FALLBACK)
        lc_out = by_slug(annotate_models([hi, lc]))["lc"]
        assert lc_out["rightsizing_gap_pct"] == {"low": 0, "mid": 0, "high": 0}
        assert lc_out["frontier_reference_slug"] is None
        assert "LOW_CONFIDENCE_GAP" in lc_out["flags"]

    def test_empty_input(self):
        assert compute_frontier([]) == set()
        assert annotate_models([]) == []
        fleet = compute_fleet_rightsizing([])
        assert fleet["avoidable_co2_kg"]["mid"] == 0
        assert fleet["models_included"] == 0

    def test_ties_capability_and_intensity_both_on_frontier(self):
        # Identical points: neither strictly dominates the other -> both on frontier.
        a = make_model("a", 50, (3000, 4000, 5000), (20000, 30000, 40000))
        b = make_model("b", 50, (3000, 4000, 5000), (20000, 30000, 40000))
        assert compute_frontier([a, b]) == {"a", "b"}
