# specs/phase-6j-sourced-energy-upgrade.md — Sourced energy upgrade (measurable models)

## Objective
Raise real accuracy by replacing `parameter_class_fallback` with **sourced** per-output-token energy for models where defensible measured/modeled data exists (AI Energy Score v2, EcoLogits), prioritized by token share so `energy_measured_fraction` (6F) climbs fastest. Models without data **stay flagged fallback** — never invent a number (CLAUDE.md red line).

## Prerequisites
6I done. 6G ledger live (every new figure needs a `source_id`). Read `ASSUMPTIONS.md` E-series and `DATA_SCHEMAS.md` §2–§3.

## Tasks
1. Rank the latest day's models by `total_tokens`; take the top contributors covering the bulk of modeled traffic as the work list (cover the most traffic with the least work).
2. For each, find a **defensible** figure:
   - **open / partially-open:** AI Energy Score v2 (measured Wh/1000 queries) → back out Wh/output-token via the documented **E-METHOD** divisor (record the assumed mean output tokens per benchmark query).
   - **closed but EcoLogits-modelable:** EcoLogits per-output-token with a **wide** range (parameters are estimates → A3).
   - **no defensible source:** leave `energy_source: parameter_class_fallback`, keep `FALLBACK_ENERGY_CLASS`. Document the gap — do not guess.
3. Add/upgrade entries in `data/energy/intensity.yaml` with `energy_source`, the `{low, mid, high}` range, and a `source_id` → `sources.yaml` (6G). Record each derivation in `ASSUMPTIONS.md` (`E-{MODEL}`).
4. Re-run the pipeline; 6F's `energy_measured_fraction` rises by the covered token share. Update the model-subset note (A1).
5. `docs/methodology.md` — list which models are now measured vs still fallback, with the per-model source.

## Interfaces & schemas
**No shape change** — uses existing `intensity.yaml` (§3) + `source_id` (6G). `energy_source` per row flips from `parameter_class_fallback` to `ai_energy_score`/`ecologits` where upgraded. Bump `methodology_version` (data-coverage change).

## Test requirements
- **No fabrication:** a test asserts every `intensity.yaml` model entry has a resolvable `source_id`; an entry without one fails (a fabricated number cannot pass the 6G gate).
- **Range sanity (E-METHOD):** upgraded ranges fall within the documented plausible Wh/output-token envelope (the E-METHOD spread, roughly ~0.3 Wh to several Wh per query-equivalent); flag outliers.
- **Fraction climb:** on a fixture where N models are upgraded, `energy_measured_fraction` equals the upgraded models' token share (token-weighted).
- **Fallback still labelled:** un-upgraded models retain `FALLBACK_ENERGY_CLASS`.

## Acceptance criteria
- [ ] Top-traffic models that *have* defensible data are measured; each carries a `source_id` and an ASSUMPTIONS `E-` entry.
- [ ] `energy_measured_fraction` rises to match covered token share — **no target invented**; it reflects real coverage.
- [ ] Models without data remain flagged fallback; nothing fabricated.
- [ ] `pytest` green; `ruff` clean; `ASSUMPTIONS.md` + `sources.yaml` updated in the same commit.

## Standards
CLAUDE.md (no magic numbers, no silent zeros, ranges); ENGINEERING_STANDARDS §2/§3/§8. The 6G gate enforces sourcing.

## Out of scope
Grid live data (needs `ELECTRICITYMAPS_API_KEY` — a user action, tracked separately). Sensitivity/Monte Carlo (6K). UI restyle (6L).

## Definition of Done
ENGINEERING_STANDARDS §8 + acceptance above. Update `specs/INDEX.md`.
