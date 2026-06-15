# LLM Carbon Index

A public, transparent dashboard that **estimates the CO₂ footprint of the
LLM-inference traffic visible through [OpenRouter's public rankings](https://openrouter.ai/rankings)**,
broken down by model, open- vs closed-weight, provider, model origin country,
and the electricity grid of the model's *likely* serving region — plus
green-electricity substitution scenarios (location-based vs market-based,
green-X%, best-region).

## Scope statement (NON-NEGOTIABLE)

This project estimates the CO₂ footprint of **OpenRouter-visible LLM inference** —
a *representative but partial* slice of global AI usage. Consumer apps like
ChatGPT, Gemini, and Claude are **not** in it. It is **NOT** a measurement of
total global data-center emissions. **All figures are estimates with explicit
uncertainty ranges, not measurements** — especially for closed models, whose
parameters, hardware, and data-center locations are not publicly disclosed.

## Architecture (decided)

Static-first, no server to babysit (per `PLAN.md`):

```
OpenRouter rankings ─▶ pipeline (Python) ─▶ output/*.json (committed by CI) ─▶ web/ (Vite+React, static)
                                  │
                      EcoLogits + AI Energy Score (energy)
                      Electricity Maps + annual fallbacks (grid)
```

No live backend for v1. The frontend reads committed JSON; data refreshes via a
GitHub Actions cron (Phase 5).

## Status — built phase by phase ([`PLAN.md`](PLAN.md))

| Phase | Scope | State |
|---|---|---|
| 0 | Scaffold + prove the math | ✅ done ([`scratch/prove_math.py`](scratch/prove_math.py)) |
| 1 | Data ingestion (`fetch_openrouter.py`) | ⬜ planned |
| 2 | Energy estimation (`estimate_energy.py`) | ⬜ planned |
| 3 | Carbon + grid + green substitution (`estimate_carbon.py`) | ⬜ planned |
| 4 | Output assembly + frontend (`build_outputs.py`, `web/`) | ⬜ planned |
| 5 | Methodology doc + CI + deploy | ⬜ planned |

## File manifest — what a complete project here needs

Legend: ✅ exists · 🟡 stub/seed · ⬜ planned (created in its phase).

```
llm-carbon-index/
├── README.md                       ✅ this file (scope + reproduce + manifest)
├── CLAUDE.md                       ✅ agent guardrails
├── PLAN.md                         ✅ phased plan (canonical source of truth)
├── LICENSE                         ✅ MIT + data-is-estimates notice
├── CONTRIBUTING.md                 ✅ phase workflow + hard constraints
├── SECURITY.md                     ✅ secrets policy + how to report
├── CHANGELOG.md                    ✅ Keep-a-Changelog
├── .gitignore                      ✅ incl. .env, node_modules, data/raw
├── .editorconfig                   ✅ formatting baseline
├── .env.example                    ✅ documents env var NAMES only
├── pyproject.toml                  ✅ deps + pytest + ruff config
├── data/                           model data ONLY here (Hard Constraint #6)
│   ├── grid_fallback_factors.yaml  🟡 annual grid factors (seeded, cited)
│   ├── provider_region_map.yaml    🟡 provider → likely region (seeded, cited)
│   ├── model_crosswalk.yaml        🟡 schema stub (seeded in Phase 2)
│   └── closed_model_assumptions.yaml 🟡 schema stub (seeded in Phase 2)
├── pipeline/                       Python pipeline (Phases 1–4)
│   ├── README.md                   ✅ module map
│   ├── fetch_openrouter.py         ⬜ Phase 1
│   ├── electricity.py              ⬜ Phase 3
│   ├── estimate_energy.py          ⬜ Phase 2
│   ├── estimate_carbon.py          ⬜ Phase 3
│   └── build_outputs.py            ⬜ Phase 4
├── scratch/
│   └── prove_math.py               ✅ Phase 0 throwaway prover
├── tests/
│   ├── test_prove_math.py          ✅ conversion guards + sanity + ranges
│   ├── test_energy.py              ⬜ Phase 2
│   ├── test_carbon.py              ⬜ Phase 3
│   └── fixtures/                   ✅ (.gitkeep)
├── output/                         generated JSON (committed by CI, Phase 4+)
│   └── .gitkeep                    ✅
├── web/                            Vite + React static frontend (Phase 4)
│   └── README.md                   ✅ planned views + absorbed UI design
├── docs/
│   ├── methodology.md              ✅ thesis methodology (scope/formulas/sources)
│   └── absorbed-from-gemini.md     ✅ merge provenance + constraint reconciliation
└── .github/
    ├── workflows/
    │   ├── ci.yml                  ✅ run tests + ruff on push/PR
    │   └── update-data.yml         ⬜ Phase 5 daily cron → commit JSON
    ├── ISSUE_TEMPLATE/             ✅ bug + data-correction templates
    └── PULL_REQUEST_TEMPLATE.md    ✅ constraint checklist
```

## Reproduce Phase 0 locally

```bash
cp .env.example .env            # then set OPENROUTER_API_KEY (never committed)
export $(grep -v '^#' .env | xargs)
python3 scratch/prove_math.py   # pull 1 day, estimate Wh → gCO2 for one model
uv run pytest                   # or: pip install pytest && pytest
uv run ruff check .             # lint (incl. flake8-bandit secret checks)
```

Without a key or network, the prover prints a clearly-labelled **illustrative
sample** so the math is demonstrable; it never presents a sample as live data.

## Attribution

- Rankings: `Source: OpenRouter (openrouter.ai/rankings), as of {date}`.
- Grid intensity: Electricity Maps (live, Phase 3) + Ember/IEA annual fallbacks.
- Energy: EcoLogits + Hugging Face AI Energy Score. See [`docs/methodology.md`](docs/methodology.md).
