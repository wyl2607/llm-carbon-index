# specs/phase-1-ingestion.md — Data ingestion

## Objective
Reliably fetch, cache, and normalize OpenRouter `rankings-daily` into a local time series. No energy or CO₂ math in this phase.

## Prerequisites
Phase 0 done. `OPENROUTER_API_KEY` available in `.env`. Read `CLAUDE.md`, `ENGINEERING_STANDARDS.md`, `DATA_SCHEMAS.md`.

## Tasks
1. `pipeline/__init__.py`, `pipeline/config.py` — load env + resolve data paths (`data/raw/`, etc.). No keys in code.
2. `pipeline/openrouter.py`:
   - `fetch_rankings_daily(date: str | "latest") -> dict` — GET `https://openrouter.ai/api/v1/datasets/rankings-daily`, auth `Authorization: Bearer ${OPENROUTER_API_KEY}`. Respect rate limits (**30 req/min, 500 req/day**) with simple backoff. Raise typed errors: `AuthError`, `RateLimitError`, `NetworkError`.
   - **Cache:** write the raw response to `data/raw/openrouter/{date}.json`; if the cache file exists, read it instead of calling the API (idempotent; avoids burning the daily quota).
   - `normalize(raw) -> list[NormalizedRecord]` — one record per `(date, model_slug)` with `total_tokens` = prompt+completion (as reported). **Capture the reserved `other` aggregate row separately** (it's the denominator for `modeled_traffic_fraction`) — do not drop it, do not merge it into a model.
3. `pipeline/storage.py` — append normalized records to `data/raw/normalized.jsonl` (or parquet); dedupe on `(date, model_slug)`; stable ordering.
4. `pipeline/ingest.py` — CLI entry: `python -m pipeline.ingest --date latest`.
5. Add deps as needed (`pyyaml`, an HTTP client). Keep it minimal.

## Interfaces & schemas
`NormalizedRecord`: `{ date: str, model_slug: str, total_tokens: int, is_other: bool }`. (Energy/region/CO₂ are added in Phase 2 — not here.)

## Test requirements
- Save a real (key-free) sample response to `tests/fixtures/rankings_daily_sample.json`.
- Inject a fake fetcher so tests **never hit the network**; assert normalization is correct and the `other` row is retained with `is_other: true`.
- Assert dedupe: ingesting the same day twice yields no duplicates.
- Assert cache hit path: with a cache file present, the API client is not called.

## Acceptance criteria
- [ ] `python -m pipeline.ingest --date latest` writes normalized records and the raw cache.
- [ ] `other` aggregate retained as a flagged record.
- [ ] Rate-limit backoff + typed errors present; cache makes re-runs offline-safe.
- [ ] No key in code; tests pass offline; `pytest` green; `ruff` clean.

## Standards
ENGINEERING_STANDARDS §1, §3 (typed errors), §4 (secrets), §5 (no network in tests), §6 (capture `data_date` for citation).

## Out of scope
Energy, CO₂, regions, model facts, output JSON, any model slug literal in `.py`.

## Definition of Done
ENGINEERING_STANDARDS §8 checklist + the acceptance criteria above. Update `specs/INDEX.md` row for Phase 1.
