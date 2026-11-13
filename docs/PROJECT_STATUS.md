# Project status & handoff

_Last updated: 2026-11-13._

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
- `web/` — Vite+React+TS dashboard reading `data/output/latest.json`. `scratch/prove_math.py` was the Phase-0 prover (since removed).

## Status — MVP (0–5) + Phase 6A–6E done
| Phase | State |
|---|---|
| 0 prove-math, 1 ingestion, 2 estimation, 3 output+schema, 4 frontend, 5 methodology+CI | ✅ done, see `specs/INDEX.md` for commit hashes |
| 6A green-electricity scenarios, 6B market-vs-location, 6C trends+Jevons, 6D water (WUE) | ✅ done (shipped in the premium dashboard; hashes in `specs/INDEX.md`) |
| 6E coverage automation (scope honesty) | ✅ done — unmapped traffic is measured explicitly and current high-volume gaps are maintained through sourced crosswalk updates |

- Methodology version: **0.9.2** (`pipeline/__init__.py`). It changes with
  releases — read it from that file.
- Tests: `uv run pytest -q` → 213 passed on 2026-11-13. Re-run the command for
  the current count.
- Lint: `uv run ruff check .`.
- `uv run python -m pipeline.run --date latest` produces a schema-valid `latest.json`.
- CI: workflows live in `.github/workflows/` (`ci.yml` runs tests, lint,
  provenance, and golden replay; `pipeline.yml` refreshes data; `deploy.yml`
  publishes Pages). Read the workflow files for current triggers and secrets.
- Latest committed output: `data/output/latest.json`. Read model counts and
  coverage from that file; they change with each data refresh.

## Current handoff (2026-11-13)
- Open PR: [#177](https://github.com/wyl2607/llm-carbon-index/pull/177)
  (methodology 0.10.0 — annual all-region grid envelope for unmapped slugs).
- Open issues: [#113](https://github.com/wyl2607/llm-carbon-index/issues/113)
  (unmapped measured traffic), [#149](https://github.com/wyl2607/llm-carbon-index/issues/149)
  (methodology defaults that move the headline).
- Query live state instead of trusting this page:
  `gh pr list --state open`, `gh issue list --state open`.

## Known issues / top next tasks
1. Work the open issues above; #113 and #149 are the current starting points.
2. Review the open PR before the next release.
3. For reproducibility checks, run the gates in `docs/ENGINEERING_STANDARDS.md`
   and `make verify {date}` rather than relying on snapshots in prose.
