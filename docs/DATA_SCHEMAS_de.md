[English](DATA_SCHEMAS.md) | [中文](DATA_SCHEMAS_zh.md) | [Deutsch](DATA_SCHEMAS_de.md)

# docs/DATA_SCHEMAS.md

Die einzig wahre Quelle für jede Artefaktform. Wenn eine Phase eine Form ändern muss, bearbeiten Sie diese Datei im selben Commit. Alle untenstehenden Feldnamen sind kanonisch — verwenden Sie sie wortwörtlich.

## Konventionen

- Ein **Range** ist immer `{"low": number, "mid": number, "high": number}` mit `low ≤ mid ≤ high`.
- Token-Zählungen sind Ganzzahlen. Energie in **kWh**. Kohlenstoffintensität in **gCO₂eq/kWh**. Emissionen in **kg CO₂eq**.
- `origin` ∈ `{ "CN", "US", "EU", "OTHER" }`. `open_or_closed` ∈ `{ "open", "closed" }`.
- `flags` Vokabular: `UNKNOWN_MODEL`, `FALLBACK_ENERGY_CLASS`, `FALLBACK_GRID_ANNUAL`, `CLOSED_MODEL_ASSUMED`. (`ILLUSTRATIVE_SAMPLE` darf nur in scratch/dev erscheinen — **nie** in einem veröffentlichten Artefakt.)

---

## 1. `data/output/latest.json` (und `data/output/history/{date}.json`)

```jsonc
{
  "methodology_version": "0.1.0",
  "generated_at": "2026-06-15T00:00:00Z",      // flüchtig; von Golden-File-Tests ausgeschlossen
  "data_date": "2026-06-14",                    // der OpenRouter-Tag, den dies widerspiegelt
  "source_citation": "Source: OpenRouter (openrouter.ai/rankings), as of 2026-06-14",
  "scope_note": "Estimated CO2 footprint of LLM-inference traffic visible through OpenRouter. NOT global data-center emissions. All figures are estimates with uncertainty.",
  "assumptions": {                              // v0.2 Snapshot übergreifender Faktoren
    "input_output_ratio": "80:20",              // A2; siehe ASSUMPTIONS.md
    "pue_band": "1.1 / 1.25 / 1.56",            // A4 (überarbeitet zu einem Band)
    "prefill_alpha": "0.1 / 0.2 / 0.3",         // E-PREFILL
    "embodied_ratio_of_operational": "0.28 / 0.39 / 0.54", // C-EMBODIED
    "water_l_per_kwh": "onsite 0.3/0.9/1.8 + offsite EWIF 2.0/3.14/4.35"  // W-WATER
  },
  "sources": [                                    // Phase 6G: kompakte Provenienz-Einträge, auf die die Zahlen dieses Tages verweisen
    { "id": "C-GRID-EGRID", "title": "eGRID2022", "publisher": "US EPA", "url": "https://www.epa.gov/egrid", "version": "2022", "accessed": "2026-06-14" }
  ],
  "models": [
    {
      "slug": "minimax/minimax-m2.5",
      "display_name": "MiniMax M2.5",
      "origin": "CN",
      "open_or_closed": "open",
      "total_tokens": 4550000000000,            // Prompt + Completion, wie von OpenRouter gemeldet
      "est_output_tokens": 910000000000,        // abgeleitet via input_output_ratio
      "wh_per_output_token": { "low": 0.0008, "mid": 0.0015, "high": 0.003 },
      "energy_kwh": { "low": 728, "mid": 1365, "high": 2730 },
      "energy_source": "ai_energy_score",       // ai_energy_score | ecologits | parameter_class_fallback
      "energy_source_id": "E-MINIMAX-M2.5",     // Phase 6G: Provenienz-Schlüssel dieser Energiezahl -> sources.yaml
      "region": "us-east",
      "carbon_intensity_gco2_kwh": 380,
      "grid_source": "electricity_maps_live",   // electricity_maps_live | annual_factor
      "grid_source_id": "GRID-EM-LIVE",         // Phase 6G: Provenienz-Schlüssel dieser Netzzahl -> sources.yaml
      "pue": 1.25,                              // repräsentativer Skalar (Mitte des A4-Bands)
      "co2_kg": { "low": 332, "mid": 622, "high": 1245 },          // operativ, standortbasiert
      "co2_kg_embodied": { "low": 93, "mid": 243, "high": 672 },   // C-EMBODIED (amortisierte Herstellung)
      "co2_kg_total": { "low": 425, "mid": 865, "high": 1917 },    // operativ + embodied (voller Lebenszyklus)
      "co2_kg_market": { "low": 332, "mid": 622, "high": 1245 },   // marktbasiert (Vendor Renewable Match)
      "wue": 4.04,                              // repräsentativer kombinierter L/kWh (W-WATER)
      "water_liters": { "low": 2300, "mid": 4040, "high": 6150 },
      "flags": []
    }
  ],
  "totals": {
    "total_tokens": 0,
    "uncovered_tokens": 0,                       // OpenRouter "other"-Aggregat, nicht individuell modelliert
    "modeled_traffic_fraction": 0.0,             // (total_tokens - uncovered) / total_tokens; quantifiziert Scope-Redlichkeit
    "precision": {                               // Phase 6F: Schätz-Tier-Redlichkeit (berichtet bestehende energy_source/grid_source-Flags; keine neuen gesourcten Zahlen)
      "energy_measured_fraction": 0.0,           // token-gewichtet; gemessene (ai_energy_score/ecologits) ÷ modellierte Tokens
      "energy_class_fallback_fraction": 1.0,     // summiert mit energy_measured_fraction zu 1.0
      "grid_live_fraction": 0.0,                 // token-gewichtet; electricity_maps_live ÷ modellierte Tokens
      "grid_annual_fallback_fraction": 1.0,      // summiert mit grid_live_fraction zu 1.0
      "models_measured": 0, "models_total": 50, "grid_live_models": 0  // Zähl-Begleiter für UI-Text
    },
    "mapped_traffic_fraction": 0.0,              // Phase 6E: (total - uncovered - unmapped) / total; ehrlicher Anteil, der einem Crosswalk-Eintrag zugeordnet ist
    "unmapped_tokens": 0,                        // Phase 6E: Tokens auf Top-List-Slugs, die nicht in model_crosswalk.yaml sind (als UNMAPPED_SLUG markiert, nie stillschweigend gebuckelt)
    "unmapped_traffic_fraction": 0.0,            // Phase 6E: unmapped_tokens / total_tokens
    "unmapped_slugs": [ { "slug": "vendor/new-x", "total_tokens": 0 } ],  // Phase 6E Wartungs-To-Do: diese zum Crosswalk hinzufügen (absteigend nach Tokens sortiert)
    "co2_kg": { "low": 0, "mid": 0, "high": 0 },
    "co2_kg_embodied": { "low": 0, "mid": 0, "high": 0 },   // C-EMBODIED Gesamt
    "co2_kg_total": { "low": 0, "mid": 0, "high": 0 },      // operativ + embodied Gesamt
    "by_origin": { "CN": { "co2_kg": {"low":0,"mid":0,"high":0} } },
    "by_open_closed": { "open": { "co2_kg": {"low":0,"mid":0,"high":0} }, "closed": { "co2_kg": {"low":0,"mid":0,"high":0} } },
    "fairness": {                                 // Phase 6I
      "rank_stability": {
        "by_co2":        { "top_n": 10, "ranks_changed": 0, "max_displacement": 0 },
        "by_efficiency": { "top_n": 10, "ranks_changed": 0, "max_displacement": 0 }
      },
      "unweighted": { "co2_kg": { "low": 0, "mid": 0, "high": 0 } }  // gleichgewichtetes Mittel pro Modell = totals.co2_kg / N (der "durchschnittliche modellierte Modell-Fußabdruck"); eine andere Zahl als der verkehrsgewichtete Gesamtwert, damit die Schlagzeile nicht als Artefakt eines oder zweier populärer Modelle gelesen wird (FAIRNESS.md §4)
    }
  }
}
```

Ein formales JSON-Schema lebt unter `schemas/output.schema.json` (in Phase 3 erstellt) und wird vor jedem Schreiben validiert.

---

## 2. `data/crosswalk/model_crosswalk.yaml` (nur Identität)

```yaml
- openrouter_slug: "minimax/minimax-m2.5"
  display_name: "MiniMax M2.5"
  origin: "CN"
  open_or_closed: "open"
  energy_source: "ai_energy_score"   # welche Methode wh_per_output_token liefert
  params_b: 230                       # Gesamt-Params (Milliarden), falls bekannt; sonst null
  active_params_b: 10                 # MoE active Params, falls zutreffend; sonst null
  assumed_provider: "minimax"         # wird für Region/PUE bei Closed-Modellen verwendet
  assumed_region: "us-east"           # Schlüssel in Electricity Maps Zone / annual_factors.yaml
```

Regel: Nur Identität + Zuordnung. **Keine Energiezahlen hier** — diese leben in §3.

---

## 3. `data/energy/intensity.yaml` (Wh pro Output-Token, mit Quelle)

```yaml
models:
  - openrouter_slug: "minimax/minimax-m2.5"
    wh_per_output_token: { low: 0.0008, mid: 0.0015, high: 0.003 }
    source: "AI Energy Score v2 (HF); see ASSUMPTIONS.md#E-MINIMAX"

parameter_class_fallback:            # verwendet, wenn ein Modell energy_source: parameter_class_fallback hat oder UNKNOWN ist
  - max_active_params_b: 15
    wh_per_output_token: { low: 0.0005, mid: 0.0012, high: 0.0025 }
    source: "ASSUMPTIONS.md#E-CLASS-SMALL"
  - max_active_params_b: 100
    wh_per_output_token: { low: 0.002, mid: 0.005, high: 0.012 }
    source: "ASSUMPTIONS.md#E-CLASS-LARGE"
```

(Zahlen oben sind Platzhalter — Phase 2 füllt reale Werte und protokolliert jede Ableitung in ASSUMPTIONS.md.)

---

## 4. `data/assumptions/closed_models.yaml` (Annahmen für opake Provider)

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

## 5. `data/grid/annual_factors.yaml` (Fallback-Netzintensität)

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

`region`-Werte sind gemeinsame Schlüssel über §2/§4/§5 und müssen mit der Electricity-Maps-Zone übereinstimmen, die Sie live abfragen.

Jeder numerische Datensatz oben trägt auch eine `source_id` (oder `source_ids`), die zu §6 auflösbar ist — siehe Provenienz-Gate.

---

## 6. `data/provenance/sources.yaml` (Provenienz-Registry — Phase 6G)

Die einzig wahre Quelle für jede Zahl. Jeder numerische Datensatz in `data/**/*.yaml` trägt eine `source_id` (String) oder `source_ids` (Liste), die **muss** zu einem `id` hier auflösbar sein, sonst schlägt der Build fehl (`pipeline/provenance.py` → `unsourced_numbers`, läuft in CI und als pytest-Gate). IDs wiederverwenden das `docs/ASSUMPTIONS.md`-Schema (`A*` / `E*` / `C*` / `DC*` / `V*`), wo eines existiert.

```yaml
- id: "C-GRID-EGRID"
  title: "eGRID2022"
  publisher: "US EPA"
  url: "https://www.epa.gov/egrid"
  version: "2022"
  accessed: "2026-06-14"
  locator: "US average output emission rate"   # Seiten-/Tabellen-/Abschnitts-Pointer
  license: "public domain (US gov)"
  claim: "annual-average US grid emission factor"  # KURZE PARAPHRASE, niemals wörtliches Zitat
```

**Copyright:** `claim` ist immer eine kurze Paraphrase + Locator, niemals reproduzierter Quelltext; das Gate begrenzt die Länge von `claim`. Die kompakte Teilmenge `{id, title, publisher, url, version, accessed}` der tatsächlich von den Zahlen eines Tages referenzierten Einträge wird in `latest.json` `sources[]` (§1) emittiert, und jedes Modell trägt `energy_source_id` / `grid_source_id`, sodass jede veröffentlichte Zahl end-to-end nachverfolgbar ist.

---

## 7. `data/output/manifest.json` (Run-Manifest — Phase 6H)

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

Snapshots (unter `data/raw/snapshots/{data_date}/`) sind **Eingaben** für einen Run, keine veröffentlichten Artefakte. Aufbewahrungsrichtlinie: die letzten N Tage Snapshots im Repo behalten; ältere archivieren oder löschen. Jeder `sha256:`-Wert ist der Digest über die *exakten* Bytes der entsprechenden Snapshot-Datei (oder des Annual-Factor-Fallback-Datensatzes, der anstelle einer Grid-Antwort verwendet wurde).
