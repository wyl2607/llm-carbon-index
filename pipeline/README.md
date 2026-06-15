# pipeline/ — Python data pipeline (Phases 1–4)

Static-first: each module is a plain script/function set, run by CI to produce
committed JSON in `output/`. There is **no live backend** (v1). Modules are
created in their phase — none are implemented yet.

| Module | Phase | Responsibility |
|---|---|---|
| `fetch_openrouter.py` | 1 | Authenticated pull of `rankings-daily`; store dated raw records under `data/raw/` (SQLite or parquet); handle the `other` aggregate row; `backfill(start, end)`; respect rate limits (≤30/min, ≤500/day); record the attribution string. Key from env, never logged. |
| `estimate_energy.py` | 2 | `(model_slug, prompt_tokens, completion_tokens) -> Wh{min,max}`. EcoLogits baseline + AI Energy Score cross-check for open models + flagged `fallback` heuristic for unknowns. Apply PUE. Model facts from `data/*.yaml` only. |
| `electricity.py` | 3 | Electricity Maps client (live gCO₂/kWh + renewable %) with caching and graceful fallback to `data/grid_fallback_factors.yaml`; record which source was used per row. |
| `estimate_carbon.py` | 3 | `Wh × PUE × gCO₂/kWh -> gCO₂{min,max}` + scenarios (location, green-X%, best-region, market-based 100%). |
| `build_outputs.py` | 4 | Assemble `output/latest.json` + `output/timeseries.json`: per-model tokens/Wh/CO₂(+range)/efficiency/open-closed/origin/provider/region/renewable%/scenarios, plus ecosystem aggregates. |

Tests for the whole chain live in `tests/` (conversion guards are mandatory).
The Phase-0 prover (`scratch/prove_math.py`) is the throwaway predecessor to
`estimate_energy.py` + `estimate_carbon.py`.
