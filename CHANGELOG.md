# Changelog

All notable changes to this project are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); this project is pre-1.0.

## [Unreleased]

### Added — Phase 0 (scaffold + prove the math)
- Standalone repo scaffold: `README` (with scope statement + file manifest),
  `CLAUDE.md`, `PLAN.md`, `LICENSE` (MIT), `CONTRIBUTING.md`, `SECURITY.md`,
  `.gitignore` (incl. `.env`), `.env.example`, `.editorconfig`, `pyproject.toml`
  (pytest + ruff), GitHub CI / issue / PR templates.
- `scratch/prove_math.py`: end-to-end prover — OpenRouter rankings (key from
  env, illustrative-sample fallback offline) → Wh → grid intensity → gCO₂, with
  a per-prompt sanity check. Every constant cites its source; uncertainty
  carried as `{min, max}`.
- `tests/test_prove_math.py`: Wh↔kWh / g↔kg conversion guards, range
  preservation, order-of-magnitude sanity (7 tests).
- `docs/methodology.md`: seeded thesis-methodology draft (scope, formulas,
  constants + sources, location vs market-based Scope 2 discussion, limitations).
- Seed reference data in `data/`: `grid_fallback_factors.yaml`,
  `provider_region_map.yaml` (cited); schema stubs for `model_crosswalk.yaml`
  and `closed_model_assumptions.yaml`.

### Merged
- Absorbed design ideas from the parallel Gemini effort
  (`openrouter-co2-rankings`): location-based vs market-based dual accounting,
  separate prompt/completion energy intensity, provider→region→grid model, and
  the Light Minimalist UI design language. Reconciled to `PLAN.md` hard
  constraints (added source citations, `{min,max}` ranges, `data/*.yaml`
  placement, fallback+confidence, static-JSON architecture). Provenance and the
  rejected items are documented in `docs/absorbed-from-gemini.md`.

### Not yet implemented
- Pipeline Phases 1–5 (ingestion, energy, carbon, output assembly, frontend app,
  CI cron, deploy). Stubs are listed in the README manifest, not coded.
