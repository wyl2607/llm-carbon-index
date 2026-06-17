# PLAN.md — LLM Carbon Index

> Hand this file, together with `CLAUDE.md`, to your coding agent.
> The agent must implement the project **one phase at a time**, in order,
> and must obey the **Hard Constraints** section.

> **Status (2026-06-17): fully delivered.** Phases 0–5 (this document) plus the
> post-MVP roadmap (6A–6R) are all shipped; `main` is green and deployed.
> This file is the **founding charter** — the scope, decisions, and hard
> constraints below remain binding. For live phase status with commit hashes,
> the authoritative ledger is [`specs/INDEX.md`](specs/INDEX.md); the future
> backlog lives in [`PLANS.md`](PLANS.md).

---

## 1. What this project is

A public, transparent dashboard that **estimates the CO₂ footprint of the
LLM-inference traffic visible through OpenRouter's public rankings**, broken
down by:

- model
- open-weight vs. closed-weight
- provider
- model origin country (e.g. US / China / EU)
- the electricity grid of the model's *likely* serving region

…plus **green-electricity substitution scenarios** (what the footprint would be
under different grid mixes / locations / 24-7 clean-energy assumptions).

### Scope statement (NON-NEGOTIABLE — must appear in README, the site, and docs/methodology.md)

This project measures **OpenRouter-visible API inference**, which is a
*representative but partial* slice of global AI usage (consumer apps like
ChatGPT / Gemini / Claude are **not** in it). It is **NOT** a measurement of
total global data-center emissions. **All figures are estimates with explicit
uncertainty ranges, not measurements** — especially for closed models, whose
parameters, hardware, and data-center locations are not publicly disclosed.

---

## 2. Decisions already made (change only if the human instructs)

| Area | Decision | Why |
|---|---|---|
| Pipeline language | **Python** | EcoLogits is Python; reuse it instead of reimplementing |
| Output | **Static JSON committed by CI**; frontend reads it. No live backend for v1 | Cheapest, most robust, reproducible, portfolio-friendly |
| Frontend | **Vite + React** (Tailwind ok). Next.js static export also acceptable | Static site, no server to maintain |
| Energy engine | **Hybrid**: EcoLogits baseline + AI Energy Score cross-check for open models + documented fallback for unknowns; core formula re-implemented & documented in methodology.md | Speed + thesis credibility |
| Grid data | **Electricity Maps** (live) with **annual-average grid factors as fallback** | Free tier is limited / non-commercial; need a graceful degrade |
| Hosting | Frontend on **Vercel or GitHub Pages**; data refresh via **GitHub Actions cron** | No infra to babysit; secrets live in repo secrets |
| Build order | **Strictly phase by phase.** Each phase ends with tests green + a commit before the next begins | Keeps the agent on rails; always rollback-able |

---

## 3. Hard Constraints (the agent MUST obey all of these)

1. **Secrets never touch git.** Read all keys from environment variables. `.env`
   is gitignored; `.env.example` documents the variable *names* only. CI reads
   from repository secrets.
2. **No magic numbers.** Every numeric constant (energy intensity, PUE,
   emission factor, parameter count, active-param count) carries a source
   citation in a code comment **and** in `docs/methodology.md`.
3. **Tests for the whole CO₂ chain.** Every function in the
   energy → carbon calculation must have unit tests, with explicit
   **unit-conversion guards** (Wh↔kWh, g↔kg, per-token↔per-1000-queries).
   Conversion errors are the #1 risk in this project.
4. **No silent zeros/nulls for unknown models.** If a model can't be resolved,
   flag it `source: "fallback"` with a `confidence` field. Never let an unknown
   model silently contribute 0 to a total.
5. **Carry uncertainty as `{min, max}` ranges end-to-end.** Do not collapse to a
   single false-precision number. EcoLogits returns ranges — preserve them
   through aggregation.
6. **Model data lives ONLY in `data/*.yaml`.** No model names, parameter counts,
   hardware assumptions, or regions hardcoded in `.py` files.
7. **OpenRouter limits & attribution.** Stay within 30 requests/min and 500
   requests/day per key. Wherever data is shown or exported, include:
   `Source: OpenRouter (openrouter.ai/rankings), as of {date}`.
8. **Electricity Maps terms.** Respect the free-tier / non-commercial terms.
   When live data is unavailable or the region is unsupported, fall back to the
   annual-average grid factor table and record which source was used per row.
9. **Tokenizer caveat.** Token counts from different providers use different
   tokenizers and are not directly comparable. Note this in any cross-model
   aggregate and in methodology.md.

---

## 4. Repository layout (target)

```
llm-carbon-index/
├── CLAUDE.md                      # agent guardrails (rename AGENTS.md for Codex)
├── PLAN.md                        # this file
├── README.md
├── pyproject.toml                 # (or requirements.txt)
├── .env.example                   # documents required env var NAMES only
├── .gitignore                     # must include .env
├── data/
│   ├── model_crosswalk.yaml       # OpenRouter slug -> energy source + assumptions
│   ├── closed_model_assumptions.yaml
│   ├── provider_region_map.yaml   # provider -> likely DC region(s) + confidence
│   └── grid_fallback_factors.yaml # annual avg gCO2/kWh per region (Ember/IEA)
├── pipeline/
│   ├── fetch_openrouter.py        # pull rankings-daily, store raw time series
│   ├── electricity.py             # Electricity Maps client + fallback
│   ├── estimate_energy.py         # tokens -> Wh (EcoLogits + AI Energy Score)
│   ├── estimate_carbon.py         # Wh -> CO2 + green-substitution scenarios
│   └── build_outputs.py           # assemble JSON for the frontend
├── tests/
│   ├── test_energy.py
│   ├── test_carbon.py             # unit-conversion + scenario guards
│   └── fixtures/
├── output/                        # generated JSON (committed by CI)
│   ├── latest.json
│   └── timeseries.json
├── web/                           # Vite + React frontend (reads ../output/*.json)
│   └── ...
├── docs/
│   └── methodology.md             # DOUBLES AS THE THESIS METHODOLOGY SECTION
└── .github/workflows/
    └── update-data.yml            # cron: run pipeline -> commit JSON
```

---

## 5. Key data sources (with URLs — put these in methodology.md too)

- **OpenRouter rankings-daily API** — top-50 models/day by total token usage
  (prompt+completion) plus an aggregated `other` row; authenticate with an
  OpenRouter API key.
  `https://openrouter.ai/docs/api/api-reference/datasets/get-rankings-daily`
- **EcoLogits** — estimates energy + CO₂ (with min/max ranges) of API LLM calls
  from token counts + model assumptions; LCA-based (ISO 14044), Python library,
  self-hostable API, public calculator.
  `https://ecologits.ai` · `https://github.com/genai-impact/ecologits`
  · API: `https://github.com/mlco2/ecologits-api`
  · calculator: `https://huggingface.co/spaces/genai-impact/ecologits-calculator`
- **AI Energy Score** — measured Wh per 1000 queries, 5-star ratings, open /
  partially-open models, includes reasoning models (v2).
  `https://huggingface.co/spaces/AIEnergyScore`
  · `https://github.com/huggingface/AIEnergyScore`
- **Electricity Maps API** — carbon intensity (gCO₂eq/kWh) + renewable % by
  region, queryable by data-center region; real-time / historical / forecast;
  free tier is non-commercial and limited.
  `https://app.electricitymaps.com/developer-hub/api/reference`
- **Fallback annual grid factors** — Ember (`ember-energy.org`), IEA, and
  national grid operators (e.g. UK Carbon Intensity API: `carbonintensity.org.uk`).

---

## 6. Phases

> Each phase has concrete tasks and **acceptance criteria**. Do not move to the
> next phase until the acceptance criteria pass and tests are green, then commit.

### Phase 0 — Scaffold + prove the math
**Tasks**
- Initialize the repo, `CLAUDE.md`, `README.md` (with the scope statement),
  `.gitignore` (incl. `.env`), `.env.example`, and Python deps.
- Write a single throwaway script / notebook `scratch/prove_math.py` that:
  pulls ONE day of OpenRouter rankings-daily for the top ~5 models → for ONE
  model computes Wh from a documented formula → applies ONE region's grid
  intensity → prints estimated gCO₂, with a sanity check (e.g. the per-prompt
  order of magnitude is roughly ~0.3 Wh to a few Wh, not absurd).

**Acceptance**
- Output numbers are in a plausible order of magnitude.
- Every constant used has a source citation in a comment.
- No secret is hardcoded; the OpenRouter key is read from env.

### Phase 1 — Data ingestion
**Tasks**
- `fetch_openrouter.py`: authenticated pull of rankings-daily; store as dated
  records (SQLite or parquet under `data/raw/`). Handle the `other` aggregate
  row. Provide a `backfill(start, end)` function. Respect rate limits.

**Acceptance**
- Running twice does not duplicate rows.
- Key read from env, never logged.
- Backfill works for a small date range.
- Attribution string stored/recorded alongside the data.

### Phase 2 — Energy estimation
**Tasks**
- Seed `data/model_crosswalk.yaml` with the current top ~15 models, each mapped
  to `energy_source: ai_energy_score | ecologits | fallback` plus
  params / active_params / assumed_hardware / open_or_closed / origin_country.
- Seed `data/closed_model_assumptions.yaml` for closed models (with sources).
- `estimate_energy.py`: `(model_slug, prompt_tokens, completion_tokens) -> Wh`
  with `{min,max}`. Use EcoLogits as engine; for open models cross-check against
  AI Energy Score (Wh/1000 queries); for unknowns use a param-class heuristic
  flagged as fallback. Apply data-center PUE.

**Acceptance**
- Every model in a day's top-50 resolves to either a real estimate or an
  explicit `source: fallback` with `confidence` (no silent zeros).
- `tests/test_energy.py` passes, including Wh↔kWh conversion guards and a
  known-input → expected-range test.

### Phase 3 — Carbon + grid + green substitution
**Tasks**
- Seed `data/provider_region_map.yaml` (provider → likely DC region(s) +
  confidence) and `data/grid_fallback_factors.yaml` (annual averages w/ sources).
- `electricity.py`: Electricity Maps client (real-time gCO₂/kWh + renewable %),
  with response caching and graceful fallback to annual factors; record which
  source was used.
- `estimate_carbon.py`: `Wh × PUE × gCO₂/kWh -> gCO₂` with `{min,max}`. Add
  scenario functions:
  1. **location-based** (actual current grid),
  2. **green-X%** (hypothetical X% renewable grid),
  3. **best-region** (shift to the lowest-carbon supported region),
  4. **market-based 100% matched** (for contrast with location-based — the
     Scope 2 distinction).

**Acceptance**
- Each model gets `{co2_g, range, scenarios, region, grid_source, confidence}`.
- `tests/test_carbon.py` passes, including g↔kg guards and a monotonicity test
  (more renewable ⇒ lower CO₂).

### Phase 4 — Output assembly + frontend
**Tasks**
- `build_outputs.py`: write `output/latest.json` + `output/timeseries.json`.
  Per model: tokens, Wh, CO₂ (+range), **CO₂-per-token efficiency**,
  open/closed, origin country, provider, region, renewable %, scenarios. Plus
  ecosystem aggregate totals and breakdowns (by open/closed, by origin, by grid).
- `web/`: Vite + React app reading the JSON. Views:
  - leaderboard by **total CO₂**
  - leaderboard by **efficiency (CO₂ per token)**
  - filters: open vs closed, origin country, provider
  - grid / renewable panel
  - **scenario sliders** (green-X%, best-region, market vs location)
  - a prominent **Methodology & Uncertainty** page

**Acceptance**
- Frontend builds and renders all boards from the static JSON.
- Uncertainty ranges and the scope statement are visible in the UI.
- Reasonable on mobile.

### Phase 5 — Methodology doc + CI + deploy
**Tasks**
- `docs/methodology.md` (this is your thesis methodology draft): scope, every
  formula, every constant + source, the assumptions tables, the **market-based
  vs location-based Scope 2** discussion, limitations / uncertainty treatment,
  and required attributions (OpenRouter + Electricity Maps).
- `.github/workflows/update-data.yml`: daily cron → run pipeline → commit JSON
  (keys from repo secrets).
- Deploy the frontend (Vercel or GitHub Pages).
- README: how to reproduce locally + the scope statement.

**Acceptance**
- CI runs green on schedule and commits fresh JSON.
- Site is live and links to the methodology page.
- A new contributor can reproduce the pipeline from the README.

---

## 7. How to drive the coding agent

- Keep `CLAUDE.md` and `PLAN.md` at the repo root.
  **Using Codex / an OpenAI agent? Rename `CLAUDE.md` → `AGENTS.md`** (that's the
  file it auto-reads).
- Work **one phase per session**. Kick-off prompt:

  > "Read `CLAUDE.md` and `PLAN.md`. Implement **Phase 0 only**. Stop when its
  > acceptance criteria pass and tests are green, then commit. Do not start
  > Phase 1."

  Then repeat for Phase 1, Phase 2, … reviewing each commit before continuing.
- If the agent wants to hardcode a model fact, stop it: it belongs in
  `data/*.yaml`. If it wants to drop the uncertainty range to a single number,
  stop it: ranges are required.
