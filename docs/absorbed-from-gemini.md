# Merge provenance — absorbed from the Gemini effort

A parallel build by Gemini lived at `~/projects/openrouter-co2-rankings`
("AI Climate Index / AICI"). It reached a working backend (SQLite + FastAPI +
daily scheduler) through its Task 3, with a Vite/React frontend in progress.

This project (`llm-carbon-index`) is the canonical, **`PLAN.md`-aligned**
continuation. We absorbed Gemini's good *ideas and data* but rebuilt them to
`PLAN.md`'s hard constraints. Gemini's repo is left untouched as a reference.

## ✅ Absorbed (kept)

| Idea | Where it lives now |
|---|---|
| Location-based **vs** market-based dual accounting (Scope-2 distinction) | `docs/methodology.md` §2.1, §5; Phase 3 scenarios |
| **Separate prompt vs completion** energy intensity (`I_prompt`, `I_comp`) | `docs/methodology.md` §2.1 (improves on Phase-0 single-token estimate) |
| Provider → physical **region** → grid-intensity model | `data/provider_region_map.yaml`, `data/grid_fallback_factors.yaml` |
| Green-electricity **replacement-rate** metric | `docs/methodology.md` §2.1 |
| **Light Minimalist** UI: KPI cards, 2-col charts, leaderboard, dual-caliper tabs | `web/README.md` (Phase 4 design language) |
| SDD-style spec/plan discipline | folded into `PLAN.md` phase workflow |

## ❌ Rejected / reworked (conflicted with `PLAN.md` hard constraints)

| Gemini choice | Constraint it broke | Resolution |
|---|---|---|
| Live FastAPI + SQLite backend on a VPS | Decision: *static JSON, no live backend for v1* | Static pipeline → `output/*.json` → static frontend |
| Grid/efficiency constants hardcoded in `config.py` (`367/580/82`, `0.05/0.15`) | #6 model data only in `data/*.yaml`; #2 no magic numbers | Moved to `data/*.yaml` **with source citations** |
| `EU = 82 gCO₂/kWh` (uncited) | #2 cite every constant | Corrected to Ember EU-27 ≈ 242; France kept separately at ~56 |
| Market-based `50/10/0` gCO₂/kWh invented (no source) | #2; #4 no silent fabrication | Deferred to Phase 3 as low-confidence per-provider PPA assumptions, sourced |
| Single `co2_location_g` / `co2_market_g` numbers | #5 carry `{min,max}` ranges end-to-end | All intensities and CO₂ carried as `{min,max}` |
| Flat `0.05/0.15 Wh/1k` default, no EcoLogits / AI Energy Score | Decision: hybrid EcoLogits + AI Energy Score engine | Phase 2 uses EcoLogits baseline + AI Energy Score cross-check + flagged fallback |
| `get_model_or_default` silently inserts defaults; `tokens or 0` | #4 no silent 0/null; need `source:fallback` + `confidence` | Phase 2 fallback path must emit `source: "fallback"` + `confidence` |
| Macro framing ("宏观碳足迹") | Scope statement: partial slice, not total | Scope statement enforced in README, site, methodology |

## Note

Gemini's numeric values were treated as **leads to verify, not facts to copy**.
Where a value lacked a citation we either sourced it (Ember/IEA/EPA) or moved it
to a later phase flagged as a low-confidence assumption.
