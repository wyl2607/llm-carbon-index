# docs/ENGINEERING_STANDARDS.md

Extends `CLAUDE.md`. Where this conflicts with a phase spec, the **stricter** rule wins. These standards apply to every phase.

## 1. Code structure

- Python 3.11+, `ruff` clean, fully type-hinted. The estimation math lives in **small pure functions** (input → output, no I/O, no globals) so it is trivially testable.
- I/O (network, file, env) is isolated in its own module (`openrouter.py`, `grid.py`, `storage.py`) and **injected** into pure logic, never reached into from inside a calculation.
- No model facts in `.py` files — ever. Model identity, parameters, regions, and energy intensities live only in `data/**/*.yaml` (enforced: a grep of `pipeline/*.py` for any model slug must return nothing).

## 2. Uncertainty representation (non-negotiable)

- Every energy/CO₂ quantity is a **Range**: `{low, mid, high}` with `low ≤ mid ≤ high`. Define one `Range` type (`pipeline/ranges.py`) and reuse it everywhere.
- **Propagation rule (MVP):** a Range times a positive scalar scales each endpoint; a Range times another positive Range multiplies endpoint-wise (`low×low`, `mid×mid`, `high×high`). This is a deliberately simple **conservative band, not a statistical confidence interval** — say exactly that in `methodology.md`. Do not invent a probabilistic interval you can't defend.
- The UI and the JSON always carry the full range. A bare point number is a bug.

## 3. Error handling & fallbacks

- Every external call (OpenRouter, Electricity Maps) is wrapped; failures raise **typed** errors.
- Fallbacks are **explicit and labelled**: when live grid data is unavailable, fall back to the annual factor table and set `grid_source` accordingly. Same pattern Phase 0 used for `ILLUSTRATIVE_SAMPLE`.
- **Never silently substitute sample/illustrative/fallback data for real data.** A consumer must always be able to tell, from the row's source label or flags, where each number came from.

## 4. Secrets

- Keys come from env only (`OPENROUTER_API_KEY`, `ELECTRICITYMAPS_API_KEY`). `.env` is git-ignored; CI uses GitHub Actions secrets.
- No key in code, fixtures, logs, or committed JSON. Before every commit: `git diff --cached --name-only` must not contain `.env`.

## 5. Testing standard

Every phase ships tests. Minimum bar by category:

- **Conversion guards:** assert Wh↔kWh, g↔kg, per-token↔per-1000-queries on known inputs.
- **Range invariants:** `low ≤ mid ≤ high` preserved through every operation; scaling by 0 → all zero; monotonic under positive scaling.
- **Fallback paths:** force the grid client to raise / return an unknown region → assert the annual fallback is used and labelled.
- **Unknown model:** a slug missing from the crosswalk → assert it is flagged and the parameter-class fallback (not a crash) is used.
- **No network in tests:** all external calls are mocked or served from `tests/fixtures/`. Tests must pass offline.
- **Schema validation** (from Phase 3 on): valid output passes; an intentionally broken record fails.
- **Golden file** (from Phase 3 on): a fixture input day produces a stable `latest.json` (excluding volatile `generated_at`).

## 6. Attribution

Any artifact derived from OpenRouter data carries: `Source: OpenRouter (openrouter.ai/rankings), as of {data_date}`. The frontend shows it; the JSON stores it in `source_citation`.

## 7. Commits

- Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`. Reference the phase, e.g. `feat(pipeline): phase 2 energy + CO2 estimation with ranges`.
- One phase per commit where practical. **Push only when the user explicitly asks** — default is local commit.

## 8. Definition of Done (run this checklist at the end of every phase)

- [ ] All Acceptance criteria in the phase spec are met.
- [ ] Tests added/updated for this phase; `pytest` is fully green.
- [ ] `ruff` is clean; everything is type-hinted.
- [ ] No secrets staged (`git diff --cached` checked); no key in code/logs/JSON.
- [ ] Any new number (constant, coefficient, ratio, region factor) is recorded in `docs/ASSUMPTIONS.md` with a source and an uncertainty note.
- [ ] Artifact shapes match `docs/DATA_SCHEMAS.md` (or the schema doc was updated in the same commit).
- [ ] No model facts hardcoded in `.py` (grep clean).
- [ ] Scope statement not violated; every emitted number carries a range or an explicit source/flag.
- [ ] `specs/INDEX.md` status row updated to ✅ with the commit hash.
- [ ] Committed locally. (Not pushed unless asked.)
