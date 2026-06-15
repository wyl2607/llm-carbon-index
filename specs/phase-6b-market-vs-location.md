# specs/phase-6b-market-vs-location.md

## Objective
Show vendors' annual renewable-matching claims (market-based) next to real-time grid reality (location-based), adhering to GHG Protocol Scope 2 framing. This distinguishes physical carbon intensity from corporate renewable energy certificate (REC) / power purchase agreement (PPA) purchases, a key differentiator for this project.

## Prerequisites
- MVP (Phases 1-5) must be live.
- `pipeline.run` must output a stable schema that can be version-bumped without breaking existing frontend clients.

## Tasks
1. **Data Layer**: Create `data/assumptions/vendor_claims.yaml`.
   - Map `provider` -> `annual_renewable_match_pct`, `ppa_notes`, `source`.
   - Update `docs/ASSUMPTIONS.md` to document the claims for all major providers (Google, Anthropic, OpenAI, etc.).
2. **Schema & Types**: Update `docs/DATA_SCHEMAS.md`, `pipeline/types.py`, and `schemas/output.schema.json`.
   - `ModelEstimate` now needs: `co2_kg_market: Range` and `renewable_match_pct: float | null`.
   - The existing `co2_kg` remains the **location-based** metric to ensure backward compatibility.
3. **Pipeline**: Update `pipeline/estimate.py` to load `vendor_claims.yaml` and compute `co2_kg_market` for each model.
   - Equation: `co2_kg_market = co2_kg * (1 - annual_renewable_match_pct / 100)`.
4. **Web Frontend**: Update the UI to render the market-based vs location-based figures side-by-side with Scope 2 explanations.

## Interfaces & Schemas

**Additions to `ModelEstimate` (Output JSON):**
```json
{
  "renewable_match_pct": 100, // Or null if no claim
  "co2_kg_market": {
    "low": 0.0,
    "mid": 0.0,
    "high": 0.0
  }
}
```

**New Data File (`data/assumptions/vendor_claims.yaml`):**
```yaml
- provider: "google"
  annual_renewable_match_pct: 100
  ppa_notes: "Google matches 100% of global electricity consumption with renewable energy purchases annually."
  source: "ASSUMPTIONS.md#V-GOOGLE"
```

## Test Requirements
- `tests/test_estimate.py` must verify that if a provider has a 100% claim, `co2_kg_market` is 0, while `co2_kg` remains the location-based value.
- Verify fallback behavior when a provider is missing from `vendor_claims.yaml` (should default to 0% match, meaning `co2_kg_market` == `co2_kg`).

## Acceptance
- Both figures (location and market) are computed per provider.
- Output JSON includes the new fields and passes schema validation.
- All numbers are sourced in `ASSUMPTIONS.md`.

## Standards
- Follow `ENGINEERING_STANDARDS.md`.
- No claim of "carbon neutral" or "zero emissions" without strict sourcing and labeling it as market-based.
- Keep the `pipeline/*.py` generic. `vendor_claims` must be data-driven.

## Out of Scope
- Hourly renewable matching (24/7 CFE). We are only using annual matched claims for now.
