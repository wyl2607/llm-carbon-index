# specs/phase-6k-uncertainty-and-sensitivity.md — Uncertainty derivation + sensitivity analysis

## Objective
Make the uncertainty treatment **thesis-grade**: document how every `{low, mid, high}` endpoint is derived, run a sensitivity analysis that identifies which assumption dominates the error band, and tighten closed-model ranges with justified widths. Keep the **conservative-band** propagation as the headline; any probabilistic interval is an explicitly-labelled *additional* view, never a replacement (ENGINEERING_STANDARDS §2). Serves *考究* (rigor).

## Prerequisites
6J done. Read `ENGINEERING_STANDARDS.md` §2 (band, not a CI) and `ASSUMPTIONS.md` (A2/A3/A4/E-series).

## Tasks
1. **Range provenance:** for each energy source method (AI Energy Score, EcoLogits, parameter-class fallback) document in `methodology.md` exactly where `low`, `mid`, `high` come from. No undocumented endpoint survives.
2. `pipeline/sensitivity.py` (pure): one-at-a-time (OAT) sweep over the key assumptions — io-ratio (A2), PUE (A4), grid factor, energy intensity — each across its plausible band; report the resulting swing in **total CO₂** and in per-model CO₂, ranked by influence → the dominant uncertainty driver.
3. `build_outputs.py` → `data/output/sensitivity.json` (schema below). Bump `methodology_version`.
4. **Closed-model ranges:** widen/justify per A3; ensure closed ranges are visibly wider than measured-open ranges (consistency with 6I fairness). Record rationale + `source_id`.
5. *(Optional, gated)* `pipeline/monte_carlo.py`: sample assumption distributions (seeded, for 6H determinism) and report a probabilistic band **clearly labelled** *"illustrative MC interval — distinct from the conservative band."* Do not display it where it could be mistaken for the headline range.
6. `docs/methodology.md` → thesis-ready: scope, every formula, every constant + `source_id`, the sensitivity results + dominant driver, a numbered **Limitations** list, and a **References** section generated from `sources.yaml`.

## Interfaces & schemas
`sensitivity.json` (`DATA_SCHEMAS.md` new §8):
```jsonc
{ "data_date": "2026-06-14",
  "drivers": [
    { "assumption": "input_output_ratio", "band": ["70:30", "90:10"],
      "total_co2_swing_pct": { "low": -22, "high": 31 }, "rank": 1 }
  ],
  "dominant": "input_output_ratio" }
```

## Test requirements
- **OAT correctness:** moving one assumption to a band edge changes total CO₂ in the expected direction and magnitude (hand-checked on a fixture).
- **Monotonicity preserved:** more renewable ⇒ lower CO₂ still holds (re-use the Phase 3 invariant).
- **Band, not CI:** a test/lint asserts the headline output range is the conservative band; any MC field is namespaced/labelled separately.
- **Closed wider than open:** on a fixture, closed-model relative range width ≥ measured-open width.

## Acceptance criteria
- [ ] Every range endpoint's derivation is documented; `sensitivity.json` emitted with a ranked dominant driver.
- [ ] Closed-model ranges justified, sourced, and visibly wider than measured-open.
- [ ] `methodology.md` reads as a citable methodology chapter (formulas, sources, limitations, references).
- [ ] `pytest` green; `ruff` clean; `ASSUMPTIONS.md` + `DATA_SCHEMAS.md` updated in the same commit.

## Standards
ENGINEERING_STANDARDS §2 (conservative band is canonical), §5, §8. No false-precision probabilistic claim.

## Out of scope
Visual restyle (6L). New energy sources beyond 6J unless trivially available.

## Definition of Done
ENGINEERING_STANDARDS §8 + acceptance above. Update `specs/INDEX.md`.
