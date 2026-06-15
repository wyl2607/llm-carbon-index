# CLAUDE.md — project guardrails

> Rename this file to `AGENTS.md` if you are using Codex / an OpenAI agent.

You are building **LLM Carbon Index**. The full phased plan is in `PLAN.md`.
Follow `PLAN.md` **phase by phase** — do not skip ahead.

## Non-negotiables
- **Secrets:** never commit; read from environment variables; `.env` is
  gitignored; CI uses repository secrets.
- **No magic numbers:** every constant cites a source in a code comment **and**
  in `docs/methodology.md`.
- **Tests required** for every function in the CO₂ chain, especially
  unit-conversion guards (Wh↔kWh, g↔kg, per-token↔per-1000-queries).
- **No silent 0/null** for unknown models — flag `source: "fallback"` with a
  `confidence` field.
- **Uncertainty as `{min, max}` ranges**, carried end-to-end. Never collapse to
  a single false-precision number.
- **Model data only in `data/*.yaml`** — nothing about specific models hardcoded
  in `.py`.
- **OpenRouter:** ≤30 req/min, ≤500 req/day; include the attribution string
  `Source: OpenRouter (openrouter.ai/rankings), as of {date}`.
- **Electricity Maps:** respect free-tier terms; fall back to annual grid factors
  when live data is unavailable, and record which source was used.

## Workflow
- One phase per session; end each phase with **tests green + a commit** before
  starting the next.
- Pipeline in **Python**; frontend is a **static Vite + React** app that reads
  committed JSON from `output/`. No live backend for v1.
- Prefer small, reviewable diffs. State any assumption you make.

## Scope statement (must appear in README and in the site UI)
This project estimates the CO₂ footprint of **OpenRouter-visible LLM inference** —
a representative but **partial** slice of global AI usage. It is **NOT** a
measurement of total global data-center emissions. All figures are **estimates
with uncertainty ranges**, not measurements.
