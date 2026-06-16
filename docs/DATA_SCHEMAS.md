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
  "assumptions": {                              // v0.2 snapshot of cross-cutting factors
    "input_output_ratio": "80:20",              // A2; see ASSUMPTIONS.md
    "pue_band": "1.1 / 1.25 / 1.56",            // A4 (revised to a band)
    "prefill_alpha": "0.1 / 0.2 / 0.3",         // E-PREFILL
    "embodied_ratio_of_operational": "0.28 / 0.39 / 0.54", // C-EMBODIED
    "water_l_per_kwh": "onsite 0.3/0.9/1.8 + offsite EWIF 2.0/3.14/4.35"  // W-WATER
  },
  "sources": [                                    // Phase 6G: compact provenance entries referenced by this day's figures
    { "id": "C-GRID-EGRID", "title": "eGRID2022", "publisher": "US EPA", "url": "https://www.epa.gov/egrid", "version": "2022", "accessed": "2026-06-14" }
  ],
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
      "energy_source_id": "E-MINIMAX-M2.5",     // Phase 6G: provenance key of this energy figure -> sources.yaml
      "region": "us-east",
      "carbon_intensity_gco2_kwh": 380,
      "grid_source": "electricity_maps_live",   // electricity_maps_live | annual_factor
      "grid_source_id": "GRID-EM-LIVE",         // Phase 6G: provenance key of this grid figure -> sources.yaml
      "pue": 1.25,                              // representative scalar (mid of A4 band)
      "co2_kg": { "low": 332, "mid": 622, "high": 1245 },          // operational, location-based
      "co2_kg_embodied": { "low": 93, "mid": 243, "high": 672 },   // C-EMBODIED (amortised manufacturing)
      "co2_kg_total": { "low": 425, "mid": 865, "high": 1917 },    // operational + embodied (full lifecycle)
      "co2_kg_market": { "low": 332, "mid": 622, "high": 1245 },   // market-based (vendor renewable match)
      "wue": 4.04,                              // representative combined L/kWh (W-WATER)
      "water_liters": { "low": 2300, "mid": 4040, "high": 6150 },
      "flags": []
    }
  ],
  "totals": {
    "total_tokens": 0,
    "uncovered_tokens": 0,                       // OpenRouter "other" aggregate not individually modeled
    "modeled_traffic_fraction": 0.0,             // (total_tokens - uncovered) / total_tokens; quantifies scope honesty
    "precision": {                               // Phase 6F: estimation-tier honesty (reports existing energy_source/grid_source flags; no new sourced numbers)
      "energy_measured_fraction": 0.0,           // token-weighted; measured (ai_energy_score/ecologits) ÷ modeled tokens
      "energy_class_fallback_fraction": 1.0,     // sums to 1.0 with energy_measured_fraction
      "grid_live_fraction": 0.0,                 // token-weighted; electricity_maps_live ÷ modeled tokens
      "grid_annual_fallback_fraction": 1.0,      // sums to 1.0 with grid_live_fraction
      "models_measured": 0, "models_total": 50, "grid_live_models": 0  // count companion for UI copy
    },
    "mapped_traffic_fraction": 0.0,              // Phase 6E: (total - uncovered - unmapped) / total; honest fraction matched to a crosswalk entry
    "unmapped_tokens": 0,                        // Phase 6E: tokens on top-list slugs absent from model_crosswalk.yaml (flagged UNMAPPED_SLUG, never silently bucketed)
    "unmapped_traffic_fraction": 0.0,            // Phase 6E: unmapped_tokens / total_tokens
    "unmapped_slugs": [ { "slug": "vendor/new-x", "total_tokens": 0 } ],  // Phase 6E maintenance to-do: add these to the crosswalk (sorted desc by tokens)
    "co2_kg": { "low": 0, "mid": 0, "high": 0 },
    "co2_kg_embodied": { "low": 0, "mid": 0, "high": 0 },   // C-EMBODIED total
    "co2_kg_total": { "low": 0, "mid": 0, "high": 0 },      // operational + embodied total
    "by_origin": { "CN": { "co2_kg": {"low":0,"mid":0,"high":0} } },
    "by_open_closed": { "open": { "co2_kg": {"low":0,"mid":0,"high":0} }, "closed": { "co2_kg": {"low":0,"mid":0,"high":0} } },
    "fairness": {                                 // Phase 6I
      "rank_stability": {
        "by_co2":        { "top_n": 10, "ranks_changed": 0, "max_displacement": 0 },
        "by_efficiency": { "top_n": 10, "ranks_changed": 0, "max_displacement": 0 }
      },
      "unweighted": { "co2_kg": { "low": 0, "mid": 0, "high": 0 } }  // equal-weight mean per model = totals.co2_kg / N (the "average modeled-model footprint"); a different number from the traffic-weighted total, so the headline isn't read as one popular model's artifact (FAIRNESS.md §4)
    }
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

Every numeric record above also carries a `source_id` (or `source_ids`) that resolves to §6 — see the provenance gate.

---

## 6. `data/provenance/sources.yaml` (provenance registry — Phase 6G)

The single source of truth for every number. Each numeric record in `data/**/*.yaml`
carries a `source_id` (string) or `source_ids` (list) that **must** resolve to one `id`
here, or the build fails (`pipeline/provenance.py` → `unsourced_numbers`, run in CI and as
a pytest gate). IDs reuse the `docs/ASSUMPTIONS.md` scheme (`A*` / `E*` / `C*` / `DC*` /
`V*`) where one exists.

```yaml
- id: "C-GRID-EGRID"
  title: "eGRID2022"
  publisher: "US EPA"
  url: "https://www.epa.gov/egrid"
  version: "2022"
  accessed: "2026-06-14"
  locator: "US average output emission rate"   # page/table/section pointer
  license: "public domain (US gov)"
  claim: "annual-average US grid emission factor"  # SHORT PARAPHRASE, never a verbatim quote
```

**Copyright:** `claim` is always a short paraphrase + a locator, never reproduced source
text; the gate caps `claim` length. The compact subset `{id, title, publisher, url,
version, accessed}` of the entries actually referenced by a day's figures is emitted into
`latest.json` `sources[]` (§1), and each model carries `energy_source_id` / `grid_source_id`
so every published number is traceable end-to-end.

---

## 7. `data/output/manifest.json` (run manifest — Phase 6H)

```jsonc
{ "runs": [ {
    "data_date": "2026-06-14",
    "code_git_sha": "abc123",
    "methodology_version": "0.5.0",
    "tool_versions": { "python": "3.11.x", "ecologits": "x.y" },
    "inputs": { "openrouter.json": "sha256:...", "grid/us-east.json": "sha256:..." },
    "output_sha256": "sha256:..."
} ] }
```

Snapshots (under `data/raw/snapshots/{data_date}/`) are **inputs** to a run, not published artifacts. Retention policy: keep the last N days' snapshots in-repo; archive or drop older ones. Every `sha256:` value is the digest over the *exact* bytes of the corresponding snapshot file (or the annual-factor fallback record used in place of a grid response).
