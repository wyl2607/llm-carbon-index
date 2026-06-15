"""Phase 0 tests for the proven math.

Focus on the conversion guards (Wh<->kWh, g<->kg) — conversion errors are the
#1 risk (PLAN #3) — plus an order-of-magnitude sanity assertion and that the
uncertainty range is preserved as {min, max} (PLAN #5).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scratch"))

import prove_math as pm  # noqa: E402


def test_wh_to_kwh_guard():
    assert pm.wh_to_kwh(1000.0) == 1.0
    assert pm.wh_to_kwh(0.0) == 0.0
    assert pm.wh_to_kwh(2500.0) == 2.5


def test_g_to_kg_guard():
    assert pm.g_to_kg(1000.0) == 1.0
    assert pm.g_to_kg(250.0) == 0.25


def test_energy_scales_with_tokens_and_pue():
    base = pm.energy_wh(1000, 5e-4, pue=1.0)
    assert base == 1000 * 5e-4
    # PUE is a pure multiplier.
    assert pm.energy_wh(1000, 5e-4, pue=1.2) == base * 1.2
    # Linear in tokens.
    assert pm.energy_wh(2000, 5e-4, pue=1.0) == 2 * base


def test_carbon_g_applies_grid_after_kwh_conversion():
    # 1000 Wh = 1 kWh; at 375 g/kWh -> 375 g. Catches a missing /1000.
    assert pm.carbon_g(1000.0, 375.0) == 375.0


def test_uncertainty_range_preserved_and_ordered():
    rng = pm.carbon_range_g(1_000_000)
    assert set(rng) == {"min", "max"}
    assert rng["min"] < rng["max"], "range must not collapse to one number"


def test_per_prompt_order_of_magnitude_is_plausible():
    # ~0.3 Wh to a few Wh per prompt is the PLAN's sanity target.
    e_min = pm.energy_wh(pm.SANITY_OUTPUT_TOKENS_PER_PROMPT, pm.ENERGY_PER_OUTPUT_TOKEN_WH["min"])
    e_max = pm.energy_wh(pm.SANITY_OUTPUT_TOKENS_PER_PROMPT, pm.ENERGY_PER_OUTPUT_TOKEN_WH["max"])
    assert 0.05 <= e_min <= 10.0
    assert 0.05 <= e_max <= 10.0


def test_main_runs_offline_and_passes_sanity(capsys):
    # No OPENROUTER_API_KEY in the test env -> illustrative sample path.
    rc = pm.main()
    out = capsys.readouterr().out
    assert rc == 0
    assert "Sanity: PASS" in out
    assert "ILLUSTRATIVE SAMPLE" in out  # never silently presents sample as live
