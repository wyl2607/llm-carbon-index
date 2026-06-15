# specs/phase-6e-coverage-automation.md — Coverage automation (scope honesty)

> Status: **in-progress** (2026-06-16). Promoted from `phase-6plus-roadmap.md` §6E to a full spec.
> Obeys `docs/ENGINEERING_STANDARDS.md`, `docs/DATA_SCHEMAS.md`, `docs/ASSUMPTIONS.md`, and the
> scope statement in `/CLAUDE.md`. One phase = one focused commit; tests green before commit.

## Objective
Keep the model crosswalk current and **quantify uncovered traffic honestly as models churn**. When an
OpenRouter top-list slug is **not** present in `data/crosswalk/model_crosswalk.yaml`, the pipeline must:
(a) **not** silently bucket it into generic defaults as if it were a modeled model, (b) **flag** it,
(c) compute an **unmapped-traffic %**, and (d) emit a **maintenance to-do** listing the unmapped slugs.
The headline `modeled_traffic_fraction` must stay accurate as the top list shifts.

## Prerequisites
- Phases 1–3 complete (ingestion → estimation → output assembly). ✅
- `data/crosswalk/model_crosswalk.yaml` exists (≈55 base-slug entries). ✅
- Frozen cross-phase contracts in `pipeline/types.py` + `schemas/output.schema.json`. ✅

## Current behaviour & the exact gap (verified 2026-06-16)
- `pipeline/estimate.py` (~L92–105): `cw = next(crosswalk entry where openrouter_slug == normalize_slug(slug))`.
  When `cw is None` it **silently** assigns defaults (`origin="OTHER"`, `open`, `region="us-east"`,
  `assumed_provider=None`) and still emits a full `ModelEstimate` → the unmapped model is counted as
  **modeled**. ← the scope-honesty violation this phase closes.
- `pipeline/output.py` (~L52–58): `uncovered_tokens` is taken **only** from the OpenRouter `is_other`
  aggregate row; `modeled_traffic_fraction = (total_tokens − uncovered_tokens) / total_tokens`.
  Unmapped-but-named slugs are not counted → `modeled_traffic_fraction` is **overstated**.

## Tasks
1. **`pipeline/estimate.py`** — when `cw is None`, still emit the estimate (keep it visible) but append the
   flag `"unmapped_slug"` to that estimate's `flags`. Keep `origin="OTHER"`, `assumed_provider=None`
   (no invented identity). Do not change behaviour for mapped slugs.
2. **`pipeline/types.py`** — extend the `Totals` TypedDict with the new fields (below). `flags` already exists
   on `ModelEstimate`.
3. **`pipeline/output.py`** — compute and add to `totals`:
   - `unmapped_tokens: int` — sum of `total_tokens` over estimates whose `flags` contain `"unmapped_slug"`.
   - `unmapped_traffic_fraction: float` — `unmapped_tokens / total_tokens` (guard div-by-zero → `0.0`).
   - `unmapped_slugs: list[{slug, total_tokens}]` — unmapped estimates, sorted desc by tokens (the maintenance to-do).
   - `mapped_traffic_fraction: float` — `(total_tokens − uncovered_tokens − unmapped_tokens) / total_tokens`;
     the honest fraction actually matched to a crosswalk entry. `modeled_traffic_fraction` stays **unchanged**
     (back-compat; it now sits between mapped and 1.0).
   - Emit a **runtime maintenance warning** (`logging.warning`, matching how `pipeline/run.py` logs) when
     `unmapped_slugs` is non-empty: name the count, the unmapped %, and instruct the maintainer to update
     `data/crosswalk/model_crosswalk.yaml`.
4. **`schemas/output.schema.json`** — add the four new fields under `totals.properties`; add
   `unmapped_tokens`, `unmapped_traffic_fraction`, `mapped_traffic_fraction` to `totals.required`
   (`unmapped_slugs` may stay optional/array). Update **in the same commit** as the code so validation passes.
5. **`docs/DATA_SCHEMAS.md`** — document the four new totals fields in §1.
6. **Tests** — extend `tests/test_estimate.py` and `tests/test_output.py` with an unmapped-slug fixture
   (a record whose slug is absent from the crosswalk). Assert the contract in *Acceptance* below.

## Interfaces & schemas
New `totals` fields (additive; existing fields unchanged):
```jsonc
"totals": {
  // ...existing...
  "modeled_traffic_fraction": 0.94,      // unchanged: (total − is_other_uncovered) / total
  "mapped_traffic_fraction": 0.88,       // NEW: (total − uncovered − unmapped) / total  ← honest
  "unmapped_tokens": 0,                   // NEW: tokens on top-list slugs absent from crosswalk
  "unmapped_traffic_fraction": 0.0,       // NEW: unmapped_tokens / total
  "unmapped_slugs": [                      // NEW: maintenance to-do, sorted desc by tokens
    { "slug": "vendor/new-model-9", "total_tokens": 12345 }
  ]
}
```
Per-model: an unmapped model carries `"unmapped_slug"` in its existing `flags` array; identity stays neutral
(`origin: "OTHER"`, no `assumed_provider`).

## Test requirements
- A fixture record with a slug **not** in the crosswalk flows through `estimate` → `output`.
- Unit tests cover the div-by-zero guard and the sort order of `unmapped_slugs`.
- Existing tests stay green (no change to mapped-slug numbers or `modeled_traffic_fraction`).

## Acceptance criteria
- The unmapped estimate's `flags` contains `"unmapped_slug"`; it is **not** given a real provider
  (`assumed_provider is None`, `origin == "OTHER"`).
- `totals.unmapped_tokens > 0`, `unmapped_traffic_fraction` matches the fixture, `unmapped_slugs` lists the slug.
- `mapped_traffic_fraction` excludes both uncovered and unmapped tokens.
- A maintenance warning is logged when unmapped slugs exist.
- `latest.json` validates against the updated `schemas/output.schema.json`.

## Standards
`ENGINEERING_STANDARDS` §2 (uncertainty carried as ranges — never collapse), the `/CLAUDE.md` rule
"no silent 0/null for unknown models — flag `source: fallback` + confidence; never silently bucket
unknowns into a known model", and the scope statement. No new magic numbers (none required); any constant
cites a source in-comment and in `methodology.md`.

## Out of scope
- Auto-editing the crosswalk / auto-classifying unknown models (humans add entries with sources).
- Frontend surfacing of the unmapped %/maintenance to-do — tracked separately as the Phase 6E frontend
  follow-on (see `specs/PHASE6E_ORCHESTRATION.md`), built after this backend contract lands.
- Re-deriving historical `modeled_traffic_fraction` for past `history/*.json` (no recompute of past days).

## Definition of Done
`uv run pytest -q` 0 failed (new tests included) · `uv run ruff check .` clean ·
`uv run python -m pipeline.run --date latest` produces a schema-valid `latest.json` carrying the new fields ·
`DATA_SCHEMAS.md` + `output.schema.json` updated in the same commit · `specs/INDEX.md` row set to ✅ with the hash.
