# specs/phase-3-output-json.md — Output JSON

## Objective
Assemble the validated `data/output/latest.json` (and `history/{date}.json`) that the frontend reads, including totals and scope metadata.

## Prerequisites
Phase 2 done (per-model enriched records). Read `DATA_SCHEMAS.md` §1.

## Tasks
1. `pipeline/output.py`:
   - Build the top-level object exactly per DATA_SCHEMAS §1: `methodology_version`, `generated_at`, `data_date`, `source_citation` (with `data_date`), `scope_note`, `assumptions` snapshot, `models[]`, `totals`.
   - **Totals:** sum `co2_kg` ranges across modeled models (endpoint-wise); compute `uncovered_tokens` from the `other` record; `modeled_traffic_fraction = (total_tokens − uncovered_tokens) / total_tokens`; break `co2_kg` down `by_origin` and `by_open_closed`.
2. `schemas/output.schema.json` — JSON Schema covering the §1 shape (required fields, Range structure, enums for `origin` / `open_or_closed` / `grid_source` / `energy_source`, flags vocabulary).
3. Validation: `pipeline/output.py` validates against the schema (jsonschema) **before** writing; invalid → raise, do not write.
4. `pipeline/run.py` — orchestrate: ingest (cached) → estimate → output. Write `data/output/latest.json` and copy to `data/output/history/{data_date}.json`.

## Test requirements
- **Schema validation:** a valid object passes; an object with a broken record (missing `co2_kg`, bad enum) fails.
- **Golden file:** a fixture input day produces a stable `latest.json` (exclude `generated_at` from the diff).
- **Totals reconciliation:** Σ model `co2_kg.mid` == `totals.co2_kg.mid` within rounding; `by_origin` / `by_open_closed` sums reconcile to the total.
- **Scope fields present:** `scope_note`, `source_citation`, `modeled_traffic_fraction` always populated.

## Acceptance criteria
- [ ] `python -m pipeline.run` writes a schema-valid `latest.json` + a history copy.
- [ ] Totals and breakdowns reconcile; `modeled_traffic_fraction` correct.
- [ ] Citation + scope note present; no point numbers (all energy/CO₂ are ranges).
- [ ] `pytest` green; `ruff` clean.

## Standards
ENGINEERING_STANDARDS §2 (ranges everywhere), §5 (schema + golden tests), §6 (attribution). Shapes match DATA_SCHEMAS exactly.

## Out of scope
Frontend, deployment, scenarios.

## Definition of Done
ENGINEERING_STANDARDS §8 + acceptance above. Update `specs/INDEX.md`.
