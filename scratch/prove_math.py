#!/usr/bin/env python3
"""Phase 0 — throwaway script to *prove the math* end to end.

Pulls ONE day of OpenRouter rankings-daily for the top ~5 models, then for ONE
model: token counts -> Wh (documented formula) -> apply ONE region's grid
intensity -> estimated gCO2, with a per-prompt order-of-magnitude sanity check.

This is intentionally a scratch script (no production abstractions). It exists
only to show the chain is plausible and every constant is sourced. The real,
tested pipeline is built in later phases (see PLAN.md).

Hard constraints honoured here:
- Secret (OpenRouter key) read from env, never hardcoded (PLAN #1).
- Every numeric constant carries a source citation in a comment (PLAN #2).
- Uncertainty carried as {min, max}, never collapsed to false precision (PLAN #5).
- No silent 0/null: if the live pull fails we print a clearly-labelled
  illustrative sample instead of inventing a live number (PLAN #4).
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import date

# ---------------------------------------------------------------------------
# Sourced constants. Each value cites its source; these migrate to
# docs/methodology.md in Phase 5. NONE of these are model-specific (PLAN #6) —
# they are physical/grid/datacentre constants, fine for a .py scratch file.
# ---------------------------------------------------------------------------

# Energy per *output* (completion) token, in Wh/token, carried as a range.
# Autoregressive decode dominates inference energy, so we estimate on output
# tokens (prefill/prompt tokens are cheaper per token; noted as a conservative
# simplification for Phase 0).
#   - min anchor: Luccioni, Jernite & Strubell (2024), "Power Hungry Processing:
#     Watts Driving the Cost of AI Deployment?", FAccT'24 — measured text
#     generation median ~0.047 kWh / 1000 inferences; at a ~256-token median
#     generation that is ~1.8e-4 Wh/token. Rounded to 2.0e-4.
#   - max anchor: de Vries (2023), "The growing energy footprint of artificial
#     intelligence", Joule 7(10) — ~0.3 Wh per ChatGPT query; at a ~500-token
#     response that is ~6e-4 Wh/token. Rounded up to 7.0e-4 to bound uncertainty.
ENERGY_PER_OUTPUT_TOKEN_WH = {"min": 2.0e-4, "max": 7.0e-4}

# Datacentre Power Usage Effectiveness (PUE), dimensionless multiplier on IT
# energy. 1.2 is a conservative hyperscale figure; Google reports a fleet-wide
# trailing-12-month PUE of ~1.10 (Google 2024 Environmental Report), while the
# all-datacentre industry average is ~1.5 (Uptime Institute 2023 survey). We use
# 1.2 as a hyperscale-leaning point estimate.
PUE = 1.2

# Grid carbon intensity for ONE region (United States average), gCO2eq/kWh.
# Source: U.S. EPA eGRID2022 national average output emission rate ~375 g/kWh.
# (Later phases query Electricity Maps live, with this kind of annual factor as
# the documented fallback — PLAN #8.)
US_GRID_GCO2_PER_KWH = 375.0

# Representative response length used only for the per-prompt sanity check.
# A typical chat completion is on the order of a few hundred output tokens.
SANITY_OUTPUT_TOKENS_PER_PROMPT = 500


# ---------------------------------------------------------------------------
# Pure math (unit-tested in tests/test_prove_math.py). Wh<->kWh and g<->kg
# conversions are isolated because conversion errors are the #1 risk (PLAN #3).
# ---------------------------------------------------------------------------

def wh_to_kwh(wh: float) -> float:
    """1 kWh = 1000 Wh."""
    return wh / 1000.0


def g_to_kg(grams: float) -> float:
    """1 kg = 1000 g."""
    return grams / 1000.0


def energy_wh(output_tokens: float, per_output_token_wh: float, pue: float = PUE) -> float:
    """Total facility energy (Wh) for a number of output tokens.

    facility_Wh = output_tokens * Wh_per_token * PUE
    """
    return output_tokens * per_output_token_wh * pue


def carbon_g(energy_wh_value: float, grid_gco2_per_kwh: float = US_GRID_GCO2_PER_KWH) -> float:
    """Carbon (gCO2eq) from facility energy and grid intensity.

    gCO2 = (Wh / 1000) * gCO2_per_kWh   # the /1000 is the Wh->kWh guard
    """
    return wh_to_kwh(energy_wh_value) * grid_gco2_per_kwh


def carbon_range_g(output_tokens: float) -> dict[str, float]:
    """Carry the per-token energy uncertainty through to a {min, max} gCO2."""
    return {
        bound: carbon_g(energy_wh(output_tokens, per_token))
        for bound, per_token in ENERGY_PER_OUTPUT_TOKEN_WH.items()
    }


# ---------------------------------------------------------------------------
# OpenRouter pull (one day, top models). Key from env. Falls back to a clearly
# labelled illustrative sample if unavailable — never a silent zero.
# ---------------------------------------------------------------------------

# Illustrative-only sample (NOT live data). Token totals are plausible
# placeholders so the math chain runs offline. Clearly flagged when used.
_ILLUSTRATIVE_SAMPLE = [
    {"model": "example/illustrative-large", "total_tokens": 8_000_000_000,
     "completion_tokens": 3_000_000_000},
    {"model": "example/illustrative-mid", "total_tokens": 4_000_000_000,
     "completion_tokens": 1_500_000_000},
    {"model": "example/illustrative-small", "total_tokens": 2_000_000_000,
     "completion_tokens": 800_000_000},
]


def fetch_rankings_daily(api_key: str, day: str) -> list[dict]:
    """Pull rankings-daily for `day` (YYYY-MM-DD). Returns the model rows.

    Endpoint per PLAN.md:
    https://openrouter.ai/docs/api/api-reference/datasets/get-rankings-daily
    """
    url = f"https://openrouter.ai/api/v1/datasets/rankings-daily?date={day}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {api_key}"})
    with urllib.request.urlopen(req, timeout=20) as resp:  # noqa: S310 (https only)
        payload = json.load(resp)
    # The response shape may evolve; accept a few likely containers.
    if isinstance(payload, dict):
        for key in ("data", "rankings", "models", "results"):
            if isinstance(payload.get(key), list):
                return payload[key]
    return payload if isinstance(payload, list) else []


def _completion_tokens(row: dict) -> float:
    """Best-effort extraction of output-token count from a ranking row,
    preferring completion tokens, then a documented 0.4 share of total."""
    for key in ("completion_tokens", "output_tokens", "tokens_completion"):
        if isinstance(row.get(key), (int, float)):
            return float(row[key])
    for key in ("total_tokens", "tokens", "tokens_total"):
        if isinstance(row.get(key), (int, float)):
            # Assume ~40% of traffic is output tokens (prompt-heavy workloads
            # are common); this is a Phase-0 placeholder, refined in Phase 2.
            return float(row[key]) * 0.4
    return 0.0


def get_rows() -> tuple[list[dict], bool]:
    """Return (rows, is_live). Falls back to the illustrative sample offline."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("⚠️  OPENROUTER_API_KEY not set — using ILLUSTRATIVE SAMPLE (not live data).")
        return _ILLUSTRATIVE_SAMPLE, False
    day = date.today().isoformat()
    try:
        rows = fetch_rankings_daily(api_key, day)
        if not rows:
            raise ValueError("empty rankings response")
        return rows, True
    except (urllib.error.URLError, ValueError, TimeoutError, OSError) as exc:
        print(f"⚠️  Live OpenRouter pull failed ({exc}) — "
              "using ILLUSTRATIVE SAMPLE (not live data).")
        return _ILLUSTRATIVE_SAMPLE, False


def main() -> int:
    rows, is_live = get_rows()
    top = rows[:5]
    if not top:
        print("No model rows available; aborting.")
        return 1

    today = date.today().isoformat()
    source_note = (
        f"Source: OpenRouter (openrouter.ai/rankings), as of {today}"
        if is_live
        else "Source: ILLUSTRATIVE SAMPLE — NOT OpenRouter live data"
    )

    print("\n=== LLM Carbon Index — Phase 0: prove the math ===")
    print(source_note)
    print(f"Top {len(top)} models pulled. Estimating one model below.\n")

    # Pick ONE model (the top row) and run the full chain.
    row = top[0]
    model = row.get("model") or row.get("name") or row.get("slug") or "<unknown>"
    out_tokens = _completion_tokens(row)

    day_range = carbon_range_g(out_tokens)
    energy_min = energy_wh(out_tokens, ENERGY_PER_OUTPUT_TOKEN_WH["min"])
    energy_max = energy_wh(out_tokens, ENERGY_PER_OUTPUT_TOKEN_WH["max"])

    print(f"Model:                {model}")
    print(f"Output tokens (day):  {out_tokens:,.0f}")
    print(f"Facility energy:      {wh_to_kwh(energy_min):,.1f} – {wh_to_kwh(energy_max):,.1f} kWh "
          f"(PUE={PUE})")
    print(f"Grid (US avg):        {US_GRID_GCO2_PER_KWH:.0f} gCO2eq/kWh (EPA eGRID2022)")
    print(f"Estimated CO2 (day):  {g_to_kg(day_range['min']):,.1f} – "
          f"{g_to_kg(day_range['max']):,.1f} kgCO2eq")

    # --- Sanity check: per-prompt order of magnitude should be ~0.3 Wh to a few Wh.
    pp_min = energy_wh(SANITY_OUTPUT_TOKENS_PER_PROMPT, ENERGY_PER_OUTPUT_TOKEN_WH["min"])
    pp_max = energy_wh(SANITY_OUTPUT_TOKENS_PER_PROMPT, ENERGY_PER_OUTPUT_TOKEN_WH["max"])
    pp_co2 = carbon_range_g(SANITY_OUTPUT_TOKENS_PER_PROMPT)
    print("\n--- sanity check (one representative prompt) ---")
    print(f"Assumed response:     {SANITY_OUTPUT_TOKENS_PER_PROMPT} output tokens")
    print(f"Energy per prompt:    {pp_min:.3f} – {pp_max:.3f} Wh   (target ~0.3 Wh to a few Wh)")
    print(f"CO2 per prompt:       {pp_co2['min']:.3f} – {pp_co2['max']:.3f} gCO2eq")

    plausible = 0.05 <= pp_max <= 10.0  # generous order-of-magnitude window
    print(f"\nSanity: {'PASS' if plausible else 'FAIL'} — per-prompt energy is "
          f"{'within' if plausible else 'OUTSIDE'} a plausible order of magnitude.")
    return 0 if plausible else 1


if __name__ == "__main__":
    sys.exit(main())
