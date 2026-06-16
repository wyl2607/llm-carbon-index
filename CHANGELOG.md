# Changelog

[English](CHANGELOG.md) | [中文](CHANGELOG_zh.md) | [Deutsch](CHANGELOG_de.md)

All notable changes to this project are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

## [0.7.0] - 2026-06-16 (vNext: accuracy & coverage)
### Added
- **Measured energy + idle (6J)**: pipeline now consumes AI Energy Score / EcoLogits measured intensities over fallback, plus an optional `E-IDLE` always-on term. `energy_measured_fraction` rises from 0.0 to ≈0.29 (3 of 50 models, token-weighted).
- **Ranking → tiering (6M)**: models with overlapping `{low,high}` CO₂ ranges are grouped into indistinguishable `totals.tiers`; tiers are the headline, exact ranks secondary.
- **Physical embodied estimator (6N)**: LLMCarbon-style `die_area × CPA × GPU_hours/lifetime/util` (`pipeline/embodied.py`) reported alongside the ratio proxy, with method spread.
- **Literature cross-validation (6P)**: `validate_literature.py` + `literature_anchors.yaml` → `validation.json`; BLOOM/Gemini pass, OpenAI 0.34 Wh report-only (blog), Jegham long-prompt flagged.
- **MoE-aware energy (6Q)**: parameter-class fallback keyed on `active_params_b` (not total).
- **Dynamic regime / batching (6O)**: sourced regime multiplier (`regime_factors.yaml`) + What-If prompt-length/batch sliders.
- **ESG / CSRD Scope-2 export (6R)**: `esg_export.json` + web download mapping location/market totals to GHG-Protocol Scope-2 dual reporting + ESRS-E1, with non-removable caveat.
- Full zh/de localization of the new tiering, regime, and ESG UI surfaces + methodology §14–§15.

## [0.6.1] - 2026-06-16 (Phase 7)
### Added
- Complete Chinese (zh) localization for the web dashboard.
- UI Readability enhancements (increased contrast for secondary text from `#717771` to `#9ba19b`).
- Plans for German (de) localization documented in `PLANS.md`.

## [0.6.0] - 2026-06-16 (Phase 6A-6L)
### Added
- **Uncertainty & Sensitivity Framework**: Formalized methodology for endpoint ranges (low/mid/high) and tracking the dominant uncertainty driver (e.g. `PUE_UNCERTAINTY`).
- **Reproducibility**: Daily snapshots with `manifest.json` checksums and golden-file `make verify` capability.
- **Fairness & Boundary Docs**: Explicit scope definition focusing on OpenRouter-visible traffic, preventing misrepresentation of global datacenter emissions.
- **UI Themes**: "Premium Dark ESG" aesthetic (modern, glass-morphism, emerald-green highlights) implemented.
- Dynamic `methodology_version` fetching and display in the web UI.

## [0.5.0] - 2026-06-15 (Phase 5)
### Added
- Thesis-grade `docs/methodology.md` detailing formulas, constants, and sources.
- GitHub Actions CI for daily data fetching and automated deployment to GitHub Pages.

## [0.4.0] - 2026-06-15 (Phase 4)
### Added
- Vite + React static frontend dashboard.
- `build_outputs.py` for aggregating pipeline output into `latest.json` and `timeseries.json`.

## [0.3.0] - 2026-06-15 (Phase 3)
### Added
- Grid carbon intensity integration (Electricity Maps and annual fallbacks).
- What-If Scenario Simulator for spatial workload shifting.

## [0.2.0] - 2026-06-15 (Phase 2)
### Added
- Energy estimation logic (`estimate_energy.py`) with fallback mechanisms based on model parameter classes.

## [0.1.0] - 2026-06-15 (Phase 1)
### Added
- Data ingestion pipeline (`fetch_openrouter.py`) targeting OpenRouter rankings.

## [0.0.1] - 2026-06-15 (Phase 0)
### Added
- Project scaffold, `PLAN.md`, `CLAUDE.md`, and initial structural constraints.
