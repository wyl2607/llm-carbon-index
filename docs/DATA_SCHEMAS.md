# docs/DATA_SCHEMAS.md

The single source of truth for every artifact shape. If a phase needs to change a shape, edit this file in the same commit. All field names below are canonical — use them verbatim.

## Conventions

- A **Range** is always `{"low": number, "mid": number, "high": number}` with `low ≤ mid ≤ high`.
- Token counts are integers. Energy in **kWh**. Carbon intensity in **gCO₂eq/kWh**. Emissions in **kg CO₂eq**.
- `origin` ∈ `{ "CN", "US", "EU", "OTHER" }`. `open_or_closed` ∈ `{ "open", "closed" }`.
- `flags` vocabulary: `UNKNOWN_MODEL`, `FALLBACK_ENERGY_CLASS`, `FALLBACK_GRID_ANNUAL`, `CLOSED_MODEL_ASSUMED`. (`ILLUSTRATIVE_SAMPLE` may appear in scratch/dev only — **never** in a published artifact.)

---

## 1. `data/output/latest.json` (and `data/output/history/{date}.json`)

```jsonc
{
  "methodology_version": "0.1.0",
  "generated_at": "2026-06-15T00:00:00Z",      // volatile; excluded from golden-file tests
  "data_date": "2026-06-14",                    // the OpenRouter day this reflects
  "source_citation": "Source: OpenRouter (openrouter.ai/rankings), as of 2026-06-14",
  "scope_note": "Estimated CO2 footprint of LLM-inference traffic visible through OpenRouter. NOT global data-center emissions. All figures are estimates with uncertainty.",
  "assumptions": {
    "input_output_ratio": "80:20",              // A2; see ASSUMPTIONS.md
    "default_pue": 1.2                           // A4
  },
  "models": [
    {
      "slug": "minimax/minimax-m2.5",
      "display_name": "MiniMax M2.5",
      "origin": "CN",
      "open_or_closed": "open",
      "total_tokens": 4550000000000,            // prompt + completion, as reported by OpenRouter
      "est_output_tokens": 910000000000,        // derived via input_output_ratio
      "wh_per_output_token": { "low": 0.0008, "mid": 0.0015, "high": 0.003 },
      "energy_kwh": { "low": 728, "mid": 1365, "high": 2730 },
      "energy_source": "ai_energy_score",       // ai_energy_score | ecologits | parameter_class_fallback
      "region": "us-east",
      "carbon_intensity_gco2_kwh": 380,
      "grid_source": "electricity_maps_live",   // electricity_maps_live | annual_factor
      "pue": 1.2,
      "co2_kg": { "low": 332, "mid": 622, "high": 1245 },
      "flags": []
    }
  ],
  "totals": {
    "total_tokens": 0,
    "uncovered_tokens": 0,                       // OpenRouter "other" aggregate not individually modeled
    "modeled_traffic_fraction": 0.0,             // (total_tokens - uncovered) / total_tokens; quantifies scope honesty
    "mapped_traffic_fraction": 0.0,              // Phase 6E: (total - uncovered - unmapped) / total; honest fraction matched to a crosswalk entry
    "unmapped_tokens": 0,                        // Phase 6E: tokens on top-list slugs absent from model_crosswalk.yaml (flagged UNMAPPED_SLUG, never silently bucketed)
    "unmapped_traffic_fraction": 0.0,            // Phase 6E: unmapped_tokens / total_tokens
    "unmapped_slugs": [ { "slug": "vendor/new-x", "total_tokens": 0 } ],  // Phase 6E maintenance to-do: add these to the crosswalk (sorted desc by tokens)
    "co2_kg": { "low": 0, "mid": 0, "high": 0 },
    "by_origin": { "CN": { "co2_kg": {"low":0,"mid":0,"high":0} } },
    "by_open_closed": { "open": { "co2_kg": {"low":0,"mid":0,"high":0} }, "closed": { "co2_kg": {"low":0,"mid":0,"high":0} } }
  }
}
```

A formal JSON Schema lives at `schemas/output.schema.json` (created in Phase 3) and is validated before any write.

---

## 2. `data/crosswalk/model_crosswalk.yaml` (identity only)

```yaml
- openrouter_slug: "minimax/minimax-m2.5"
  display_name: "MiniMax M2.5"
  origin: "CN"
  open_or_closed: "open"
  energy_source: "ai_energy_score"   # which method supplies wh_per_output_token
  params_b: 230                       # total params (billions), if known; else null
  active_params_b: 10                 # MoE active params, if applicable; else null
  assumed_provider: "minimax"         # used to look up region/PUE for closed models
  assumed_region: "us-east"           # key into Electricity Maps zone / annual_factors.yaml
```

Rule: identity + assignment only. **No energy numbers here** — those live in §3.

---

## 3. `data/energy/intensity.yaml` (Wh per output token, with source)

```yaml
models:
  - openrouter_slug: "minimax/minimax-m2.5"
    wh_per_output_token: { low: 0.0008, mid: 0.0015, high: 0.003 }
    source: "AI Energy Score v2 (HF); see ASSUMPTIONS.md#E-MINIMAX"

parameter_class_fallback:            # used when a model has energy_source: parameter_class_fallback or is UNKNOWN
  - max_active_params_b: 15
    wh_per_output_token: { low: 0.0005, mid: 0.0012, high: 0.0025 }
    source: "ASSUMPTIONS.md#E-CLASS-SMALL"
  - max_active_params_b: 100
    wh_per_output_token: { low: 0.002, mid: 0.005, high: 0.012 }
    source: "ASSUMPTIONS.md#E-CLASS-LARGE"
```

(Numbers above are placeholders — Phase 2 fills real values and records each derivation in ASSUMPTIONS.md.)

---

## 4. `data/assumptions/closed_models.yaml` (assumptions for opaque providers)

```yaml
- provider: "openai"
  models: ["openai/gpt-..."]
  assumed_cloud: "azure"
  assumed_region: "us-east"
  assumed_gpu: "H100"
  pue: 1.2
  source: "ASSUMPTIONS.md#DC-OPENAI"
```

---

## 5. `data/grid/annual_factors.yaml` (fallback grid intensity)

```yaml
- region: "us-east"
  gco2_per_kwh: 380
  year: 2022
  source: "EPA eGRID2022"
- region: "europe-west"
  gco2_per_kwh: 230
  year: 2024
  source: "Ember 2024"
```

`region` values are shared keys across §2/§4/§5 and must match the Electricity Maps zone you query live.
