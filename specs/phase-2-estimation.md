# specs/phase-2-estimation.md — Energy + CO₂ estimation (the core)

## Objective
Turn normalized token volumes into per-model **energy (kWh)** and **CO₂ (kg)** as `{low, mid, high}` ranges, with source labels and flags. Every model fact comes from `data/**/*.yaml` — none from code.

## Prerequisites
Phase 1 done (normalized store exists). `ELECTRICITYMAPS_API_KEY` in `.env`. Read `DATA_SCHEMAS.md` §2–§5 and `ASSUMPTIONS.md`.

## Tasks
1. **Seed the data files** (DATA_SCHEMAS §2–§5) for the A1 subset:
   - `data/crosswalk/model_crosswalk.yaml`, `data/energy/intensity.yaml`, `data/assumptions/closed_models.yaml`, `data/grid/annual_factors.yaml`.
   - For each energy entry, record its derivation in `ASSUMPTIONS.md` (E-series). For each closed model, record region/PUE/GPU assumptions (A3, DC-series).
2. `pipeline/ranges.py` — `Range(low, mid, high)` with `low ≤ mid ≤ high` enforced; ops: scalar-multiply, range-multiply (endpoint-wise), add. Implements ENGINEERING_STANDARDS §2.
3. `pipeline/tokens.py` — `output_tokens(total_tokens, ratio) -> int` (A2).
4. `pipeline/energy.py`:
   - `wh_per_output_token(slug, crosswalk, intensity_table) -> (Range, source, flags)` — look up intensity.yaml; if `energy_source` is `parameter_class_fallback` or the slug is unknown, use the parameter-class band and add `FALLBACK_ENERGY_CLASS` / `UNKNOWN_MODEL`.
   - `energy_kwh(wh_per_token: Range, output_tokens: int) -> Range` = `wh_per_token × output_tokens / 1000`.
5. `pipeline/grid.py`:
   - `carbon_intensity(region) -> (gco2_per_kwh: float, grid_source: str)` — query Electricity Maps **live** (zone = region); on unsupported zone / failure, fall back to `annual_factors.yaml` and set `grid_source: annual_factor`. Typed errors internally; never raise out of the fallback.
6. `pipeline/carbon.py` — `co2_kg(energy_kwh: Range, gco2_per_kwh: float, pue: float) -> Range` = `energy_kwh × pue × gco2_per_kwh / 1000`.
7. `pipeline/estimate.py` — for each normalized model record: join crosswalk → compute output tokens → energy → grid → CO₂; attach `energy_source`, `region`, `carbon_intensity_gco2_kwh`, `grid_source`, `pue`, and `flags`. Closed models get `CLOSED_MODEL_ASSUMED`.

## Interfaces & schemas
Output of `estimate.py` is the per-model object in DATA_SCHEMAS §1 **minus** the top-level wrapper (that's Phase 3). Use exact field names.

## Test requirements
- **Conversions:** Wh↔kWh and g↔kg on known inputs; `energy_kwh` and `co2_kg` match hand-computed values within tolerance.
- **Range invariants:** `low ≤ mid ≤ high` after every op; scaling by 0 → zeros.
- **Grid fallback:** mock the Electricity Maps client to raise / return unknown zone → assert `annual_factor` used and labelled.
- **Unknown model:** slug absent from crosswalk → `UNKNOWN_MODEL` + parameter-class fallback, no crash.
- **No network:** Electricity Maps client mocked; tests pass offline.
- **No hardcoded models:** a test (or CI grep) asserts no model slug literal appears in `pipeline/*.py`.

## Acceptance criteria
- [ ] Given a fixture day, the pipeline emits per-model energy + CO₂ ranges with `energy_source`, `grid_source`, and flags.
- [ ] All model facts sourced from `data/**/*.yaml`; grep of `pipeline/*.py` for slugs is empty.
- [ ] Every new number recorded in `ASSUMPTIONS.md` with a source.
- [ ] `pytest` green; `ruff` clean.

## Standards
ENGINEERING_STANDARDS §1 (pure math + injected I/O), §2 (ranges), §3 (labelled fallback), §5 (tests). `ASSUMPTIONS.md` updated for every coefficient.

## Out of scope
JSON assembly + totals (Phase 3), UI, scenarios.

## Definition of Done
ENGINEERING_STANDARDS §8 + acceptance above. Update `specs/INDEX.md`.
