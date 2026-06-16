# specs/phase-6f-estimation-tier-honesty.md — Estimation-tier honesty

## Objective
Make the **precision tier** of every published number visible. Today 100% of models fall back on parameter-class energy and annual-average grid, but neither the JSON nor the UI says so. Aggregate the per-row `energy_source` / `grid_source` labels into **token-weighted** fractions in `totals`, and surface a non-dismissible honesty badge in the UI. Adds **no new sourced numbers** — it only reports what existing flags already imply, so it carries **zero fabrication risk**.

## Prerequisites
Phases 1–5 + 6A–6E done; `data/output/latest.json` validates. Read `DATA_SCHEMAS.md` §1 and `ENGINEERING_STANDARDS.md` §2–§3.

## Tasks
1. `pipeline/precision.py` — pure functions over the per-model records:
   - `energy_tier(model) -> "measured" | "class_fallback"` from `energy_source` (`ai_energy_score`/`ecologits` → measured; `parameter_class_fallback` → class_fallback).
   - `grid_tier(model) -> "live" | "annual_fallback"` from `grid_source`.
   - `precision_fractions(models) -> dict` — **token-weighted by `total_tokens`** (consistent with `modeled_traffic_fraction`), returning the four fractions below. Each axis must sum to 1.0 (± float tol). Computed over **modeled** tokens only (exclude the `other`/uncovered aggregate).
2. `build_outputs.py` — write the new `totals.precision` block (schema below). Also compute the **count-based** companion (`models_measured`/`models_total`, `grid_live_models`) for legible UI copy.
3. Bump `methodology_version` (minor) and add a one-paragraph definition of each fraction to `docs/methodology.md` (what "measured" vs "fallback" means; why token-weighted not count-weighted).
4. **UI** (`web/`): a `PrecisionBanner` near the leaderboard, always visible, e.g. *"Current data: 0% measured energy · 0% live grid — all figures are parameter-class + annual-average estimates."* Render the per-row tier with the same badge mechanism already used for flags. Do **not** bury this on the methodology page.

## Interfaces & schemas
Add to `totals` in `DATA_SCHEMAS.md` §1 (same commit):
```jsonc
"precision": {
  "energy_measured_fraction": 0.0,        // token-weighted; measured ÷ modeled tokens
  "energy_class_fallback_fraction": 1.0,  // sums to 1.0 with the line above
  "grid_live_fraction": 0.0,
  "grid_annual_fallback_fraction": 1.0,
  "models_measured": 0, "models_total": 50, "grid_live_models": 0   // count companion (UI copy)
}
```
No `flags` vocabulary change.

## Test requirements
- **Mixed fixture:** a hand-built day with mixed sources yields the expected token-weighted fractions.
- **Axis guard:** `energy_measured + energy_class_fallback == 1.0` and same for grid (± tol); each ∈ [0, 1].
- **All-fallback case** (today's reality): every row on `parameter_class_fallback` + `annual_factor` → `energy_measured_fraction == 0.0`, `grid_live_fraction == 0.0`.
- **Schema:** valid output with the `precision` block passes; missing `precision` fails.
- **Component:** banner renders and reflects 0%/0% from a fixture JSON.

## Acceptance criteria
- [ ] `totals.precision` present and token-weighted; both axes sum to 1.0.
- [ ] UI shows the precision banner, never dismissible, alongside the existing scope banner.
- [ ] `methodology.md` defines the four fractions and the weighting choice.
- [ ] `pytest` green; `ruff` clean; `schemas/output.schema.json` + `DATA_SCHEMAS.md` updated in the same commit.

## Standards
ENGINEERING_STANDARDS §1 (pure functions), §2 (ranges untouched), §5 (tests), §8 (DoD). Scope statement reinforced, not weakened.

## Out of scope
Improving precision itself (6J/6K). Linking badges to sources (6G/6L).

## Definition of Done
ENGINEERING_STANDARDS §8 + acceptance above. Update `specs/INDEX.md`.
