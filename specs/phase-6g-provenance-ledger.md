# specs/phase-6g-provenance-ledger.md — Provenance ledger + "no unsourced number" gate

## Objective
Turn the existing "no magic numbers" rule into a **machine-checkable audit trail**. Build one structured source registry that every numeric constant in `data/**/*.yaml` resolves to, embed a compact `sources` array in the published JSON so the artifact is self-describing, and add a build gate that **fails** if any published number lacks a resolvable source. This is the backbone of *可被验证 / 溯源* (verifiable / traceable).

## Prerequisites
6F done. Read `ASSUMPTIONS.md` (ID scheme: `A*`, `E*`, `C*`, `L*`) and `DATA_SCHEMAS.md` §1–§5.

## Tasks
1. `data/provenance/sources.yaml` — one entry per source, keyed by the existing ASSUMPTIONS IDs where possible (`E-METHOD`, `C-GRID-EGRID`, `A4`, …). Schema below. Store a **paraphrased** claim + a locator (page/table/section) — never long verbatim quotes (respect source copyright).
2. Add a `source_id` (string) or `source_ids` (list) field to **every** numeric entry in `data/crosswalk/*.yaml`, `data/energy/intensity.yaml` (including the `parameter_class_fallback` bands), `data/assumptions/closed_models.yaml`, and `data/grid/annual_factors.yaml`. Each must match a key in `sources.yaml`.
3. `pipeline/provenance.py` (pure logic + a thin loader):
   - `load_sources()`, `resolve(source_id) -> Source`.
   - `unsourced_numbers(data_tree) -> list[path]` — walk all data YAML; return any numeric leaf whose record lacks a resolvable `source_id`. Fallback bands count as numbers and need a source too.
4. `build_outputs.py` — emit a top-level `sources` array into `latest.json` containing **only** the sources referenced by that day's output, and keep the `source_id`(s) on each model's energy/grid figures so every published number is traceable. Bump `methodology_version`.
5. **Gate:** a test **and** a CI step that runs `unsourced_numbers()` over the repo data and **fails on any hit**. Wire it into the Definition-of-Done flow so no future phase can add an unsourced number.
6. `docs/methodology.md` — add a "Provenance & verifiability" subsection describing the registry and the gate. Where practical, generate the ASSUMPTIONS source tables from `sources.yaml` (single source of truth).

## Interfaces & schemas
`sources.yaml` entry (add to `DATA_SCHEMAS.md`, new §6):
```yaml
- id: "C-GRID-EGRID"
  title: "eGRID2022"
  publisher: "US EPA"
  url: "https://www.epa.gov/egrid"
  version: "2022"
  accessed: "2026-06-14"
  locator: "US subregion annual output emission rates"
  license: "public domain (US gov)"
  claim: "annual-average grid emission factors by US subregion"   # paraphrase, NOT a quote
```
Add to `latest.json` (`DATA_SCHEMAS.md` §1): a top-level `"sources": [ {id,title,publisher,url,version,accessed} ]` (compact) plus `source_id`(s) on each model's energy/grid figures.

## Test requirements
- **Gate test:** a fixture data tree with one number missing `source_id` → `unsourced_numbers()` returns that path and the gate test fails; the clean tree passes.
- **Resolution:** every `source_id` in seeded data resolves to a `sources.yaml` entry (no dangling IDs). Orphan sources (defined but unreferenced) → **warn**, don't fail.
- **No-quote guard:** assert each `claim` is a short paraphrase (length cap) — discourages pasting source text.
- **Schema:** output with `sources` validates; a model figure missing its `source_id` fails.

## Acceptance criteria
- [ ] Every numeric constant in `data/**/*.yaml` carries a resolvable `source_id`.
- [ ] `latest.json` includes the referenced `sources` and per-figure `source_id`s.
- [ ] The unsourced-number gate is green and runs in CI.
- [ ] `pytest` green; `ruff` clean; `DATA_SCHEMAS.md` + `ASSUMPTIONS.md` updated in the same commit.

## Standards
Operationalizes CLAUDE.md "no magic numbers" + ENGINEERING_STANDARDS §8. Copyright: paraphrase, never reproduce source text.

## Out of scope
Adding *new* energy data (6J). Rendering provenance in the UI (6L links badges → sources).

## Definition of Done
ENGINEERING_STANDARDS §8 + acceptance above. Update `specs/INDEX.md`.
