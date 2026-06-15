# Project status & handoff

_Last updated: 2026-06-15._

## What this is
LLM Carbon Index — estimates the CO₂ footprint of **OpenRouter-visible** LLM
inference (estimates with `{low,mid,high}` ranges, **not** measurements; partial
slice, not global emissions). Static pipeline → committed JSON → static frontend.

- **Repo:** https://github.com/wyl2607/llm-carbon-index (public)
- **Live site:** https://wyl2607.github.io/llm-carbon-index/ (GitHub Pages)

## Where everything lives (repo is self-contained)
- `PLAN.md` — the original phased plan. `CLAUDE.md` — hard rules.
- `specs/INDEX.md` + `specs/phase-*.md` — the build manual (was the specs zip).
- `docs/ENGINEERING_STANDARDS.md`, `docs/DATA_SCHEMAS.md` (canonical artifact
  shapes), `docs/ASSUMPTIONS.md` (every number + source), `docs/methodology.md`
  (thesis-grade writeup), `docs/absorbed-from-gemini.md` (merge provenance).
- `pipeline/` — `config.py`/`types.py` (frozen cross-phase contracts), `openrouter.py`
  + `storage.py` + `ingest.py` (P1), `ranges/tokens/energy/grid/carbon/estimate.py`
  (P2), `output.py` + `run.py` (P3). `schemas/output.schema.json`.
- `data/` — `crosswalk/`, `energy/`, `assumptions/`, `grid/` (seeded YAML),
  `output/latest.json` + `history/{date}.json` (committed by CI). `data/raw/` is cache (gitignored).
- `web/` — Vite+React+TS dashboard reading `data/output/latest.json`. `scratch/prove_math.py` is the Phase-0 prover.

## Status — MVP complete (Phases 0–5)
| Phase | State |
|---|---|
| 0 prove-math, 1 ingestion, 2 estimation, 3 output+schema, 4 frontend, 5 methodology+CI | ✅ done, see `specs/INDEX.md` for commit hashes |

- Tests: `uv run pytest -q` → 41 green; `uv run ruff check .` clean.
- `python -m pipeline.run --date latest` produces a schema-valid `latest.json`.
- CI: `ci.yml` (tests/ruff on PR/push), `pipeline.yml` (daily 06:30 UTC cron +
  `workflow_dispatch`, uses repo secret `OPENROUTER_API_KEY`, commits data if
  changed), `deploy.yml` (Pages; chained off pipeline via `workflow_run`).
- Live site verified showing **real** OpenRouter data (50 models, modeled_traffic_fraction ≈ 0.94).

## Known issues / top next tasks
1. **Crosswalk vs real slugs (highest value).** Real OpenRouter `model_permaslug`
   values carry date suffixes (e.g. `minimax/minimax-m3-20260531`), so they miss
   the Phase-2 crosswalk seeds → every real model currently resolves to
   `UNKNOWN_MODEL` + `FALLBACK_ENERGY_CLASS` + origin `OTHER` (honest, but not
   insightful). Fix: normalize permaslug→base slug (strip date suffix) and/or
   expand `data/crosswalk/model_crosswalk.yaml` + `data/energy/intensity.yaml`
   with the current top models (with sources in `ASSUMPTIONS.md`).
2. **Live grid data.** Set repo secret `ELECTRICITYMAPS_API_KEY` to use live
   intensity; without it `grid.py` falls back to annual factors (`FALLBACK_GRID_ANNUAL`).
3. **🔑 Rotate the OpenRouter key.** It was shared in plaintext during dev; rotate
   it on openrouter.ai and re-set the secret: `gh secret set OPENROUTER_API_KEY --repo wyl2607/llm-carbon-index`.
4. **Phase 6 roadmap** (`specs/phase-6plus-roadmap.md`): scenario sliders
   (green-X%, best-region), **market-vs-location** dual accounting, history/trends,
   water usage, coverage expansion. These parallelize well against the frozen schema.

## Multi-agent orchestration (what worked)
- **grok** is the reliable in-Claude-Code write lane (`--cwd <wt> --always-approve
  --prompt-file`); ran Phases 1/2/3/4 in parallel worktrees. **agy cannot write
  headlessly inside Claude Code** (its only auto-approve flag is classifier-blocked).
  **gemini/opencode** = light read-only / review only.
- Coordinator must freeze cross-phase contracts (`types.py`/`config.py`/pinned
  deps/fixtures) before fan-out, then verify each diff/build/test and integrate.
