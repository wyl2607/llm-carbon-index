# Contributing

Thanks for helping! This project values **transparency and honesty about
uncertainty** above polish. Read `PLAN.md` (the canonical plan) and `CLAUDE.md`
(operating rules) first.

## Workflow

- **One phase at a time, in order.** Each phase ends with **tests green + a
  commit** before the next begins. Do not skip ahead.
- Prefer **small, reviewable diffs**. State any assumption you make.
- Pipeline is **Python**; frontend is a **static Vite + React** app that reads
  committed JSON from `output/`. There is no live backend for v1.

## Hard constraints (CI and review will reject violations)

1. **Secrets never touch git.** Read keys from env vars; `.env` is gitignored;
   `.env.example` documents names only. CI uses repository secrets.
2. **No magic numbers.** Every numeric constant (energy intensity, PUE, emission
   factor, parameter count) cites a source in a code comment **and** in
   `docs/methodology.md`.
3. **Tests for the whole CO₂ chain**, especially unit-conversion guards
   (Wh↔kWh, g↔kg, per-token↔per-1000-queries). Conversion errors are the #1 risk.
4. **No silent 0/null for unknown models.** Flag `source: "fallback"` with a
   `confidence` field. An unknown model must never silently contribute 0.
5. **Carry uncertainty as `{min, max}` ranges end-to-end.** Never collapse to a
   single false-precision number.
6. **Model data lives ONLY in `data/*.yaml`.** No model names, params, hardware,
   or regions hardcoded in `.py`.
7. **OpenRouter:** ≤30 req/min, ≤500 req/day; include the attribution string.
8. **Electricity Maps:** respect free-tier terms; fall back to annual grid
   factors and record which source was used per row.
9. **Tokenizer caveat:** token counts across providers are not directly
   comparable — note this in any cross-model aggregate.

## Before opening a PR

```bash
uv run pytest
uv run ruff check .
```

Fill in the PR checklist (it mirrors the hard constraints).

## Correcting data / assumptions

Found a wrong constant or a better source? Open a **Data correction** issue or
PR editing the relevant `data/*.yaml` and `docs/methodology.md` together — keep
the value and its citation in lockstep.
