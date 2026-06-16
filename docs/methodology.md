# Methodology & Uncertainty

> This document doubles as the project's thesis methodology section. Every number
> it cites traces to an entry in [`ASSUMPTIONS.md`](ASSUMPTIONS.md); every shape
> to [`DATA_SCHEMAS.md`](DATA_SCHEMAS.md).

## 1. Scope (non-negotiable)

This project estimates the CO₂ footprint of **OpenRouter-visible LLM
inference** — a *representative but partial* slice of global AI usage. Consumer
apps (ChatGPT, Gemini, Claude apps) are **not** in it. It is **NOT** a
measurement of total global data-center emissions. **All figures are estimates
with explicit uncertainty ranges, not measurements**, especially for closed
models whose parameters, hardware, and data-center locations are undisclosed.
The published `totals.modeled_traffic_fraction` states exactly how much of each
day's OpenRouter traffic we actually model.

## 2. The estimation chain

```
total_tokens (OpenRouter rankings-daily)
   └─ × 0.20  ──────────────▶ est_output_tokens          [A2, 80:20 input:output]
        └─ × wh_per_output_token (Range) ─▶ energy_Wh     [E-series; AI Energy Score / EcoLogits]
             └─ / 1000 ─────────────────▶ energy_kWh      [Wh→kWh guard]
                  └─ × PUE ──────────────▶ facility_kWh   [A4, default 1.2]
                       └─ × grid_gCO2/kWh ▶ gCO2           [C-GRID-* / Electricity Maps live]
                            └─ / 1000 ────▶ co2_kg         [g→kg guard]
```

Formally, per model per day (**v0.2**):

```
energy_kwh   = (wh_per_output_token × est_output_tokens
              + α × wh_per_output_token × est_input_tokens) / 1000   [E-PREFILL]
co2_kg       = energy_kwh × PUE × carbon_intensity_gco2_kwh / 1000   [PUE is a band, A4]
co2_embodied = co2_kg × embodied_ratio                                [C-EMBODIED]
co2_total    = co2_kg + co2_embodied
water_L      = energy_kwh × PUE × (onsite_WUE + offsite_EWIF)         [W-WATER]
```

Output (decode) tokens dominate per-token energy, but v0.2 no longer treats the
~80 % input tokens as free: the prefill phase is compute-bound and cheaper per
token (α = 0.1–0.2–0.3 of the decode rate, E-PREFILL) but not zero. The 80:20
split (A2) and α are documented sensitivity axes, not measured ratios.

**What changed in v0.2 (vs v0.1):** (1) input/prefill energy is counted; (2) PUE
is a band `{1.1, 1.25, 1.56}` not a flat 1.2 (A4); (3) an amortised **embodied**
(manufacturing) carbon term is added alongside operational (C-EMBODIED); (4) water
is split into on-site cooling + off-site generation (W-WATER). The headline
`co2_kg` remains **operational, location-based**; `co2_kg_total` is the
full-lifecycle figure. These changes raise the central estimate and *widen* the
band — multiple independent uncertainties multiplied endpoint-wise compound into a
deliberately conservative envelope (see §4).

## 3. Assumptions (full registry in `ASSUMPTIONS.md`)

| ID | What | Value | Source |
|---|---|---|---|
| A1 | Model subset (MVP) | OpenRouter top open models w/ AI Energy Score data + 1–2 closed via EcoLogits | `model_crosswalk.yaml` |
| A2 | Input:output token ratio | 80:20 → `est_output_tokens = total × 0.20`; input = total − output | OpenRouter usage study (refine) |
| A3 | DC region per model | one assumed region/provider; closed = `CLOSED_MODEL_ASSUMED` | DC-series |
| A4 | PUE | **band 1.1 / 1.25 / 1.56** (was flat 1.2) | Uptime Institute 2024 / Google |
| E-PREFILL | Input-token energy | `α·wh_out`, α = 0.1 / 0.2 / 0.3 | arXiv:2507.11417, 2512.03024 |
| C-EMBODIED | Embodied carbon | `op × {0.28,0.39,0.54}` (≈22–35 % of total) | BLOOM LCA; arXiv:2508.06524, 2501.15829 |
| W-WATER | Water (L/kWh) | on-site 0.3/0.9/1.8 + off-site EWIF 2.0/3.14/4.35 | Li et al. arXiv:2304.03271 |
| E-CLASS-* | Param-class fallback Wh/token | small 0.0005–0.0012–0.0025; large 0.002–0.005–0.012 | AI Energy Score v2 + EcoLogits |
| E-{model} | Per-model Wh/token | e.g. closed Claude-class 0.0025–0.006–0.015 (widest) | per-model entries |
| C-GRID-* | Annual grid factors (gCO₂/kWh) | us-east 380 (EPA eGRID2022), europe-west 230 (Ember 2024), cn-north 537 (Ember 2023), eu-27 242, default 400 | EPA / Ember |

The per-query energy literature spans **~0.3 Wh (Google) to ~1.8–7 Wh
(EcoLogits)** depending on assumptions (E-METHOD); our ranges are deliberately
wide to span that disagreement.

## 4. Uncertainty handling (read this before trusting any number)

Every energy/CO₂ quantity is a **Range** `{low, mid, high}` with `low ≤ mid ≤
high`, carried end-to-end (`pipeline/ranges.py`). Propagation is intentionally
simple: a Range × positive scalar scales each endpoint; a Range × Range
multiplies endpoint-wise.

**This `{low, mid, high}` band is a CONSERVATIVE ENDPOINT BAND, not a
statistical confidence interval.** It expresses the spread of defensible
assumptions, not a probability distribution. We do not claim a 95% CI or any
probabilistic coverage — to do so would imply data we do not have (especially
for closed models). A bare point number anywhere in the JSON or UI is a bug.

### 4a. Estimation-tier precision (`totals.precision`, methodology v0.3.0)

Beyond the uncertainty *band*, we also publish what **tier of input** each number
rests on. Every row already carries an `energy_source`
(`ai_energy_score` / `ecologits` → a real measurement; `parameter_class_fallback`
→ a parameter-class guess) and a `grid_source`
(`electricity_maps_live` → live grid intensity; `annual_factor` → an annual
average). `totals.precision` aggregates these flags into four fractions:

- **`energy_measured_fraction`** — share of modeled traffic whose energy rests on
  a measurement (AI Energy Score or EcoLogits), and its complement
  **`energy_class_fallback_fraction`** (parameter-class fallback). The two sum to 1.0.
- **`grid_live_fraction`** — share whose grid intensity came from live Electricity
  Maps, and its complement **`grid_annual_fallback_fraction`** (annual table). The
  two sum to 1.0.

These fractions are **token-weighted by `total_tokens`**, not count-weighted, and
computed over the modeled rows only (the `other`/uncovered aggregate is excluded).
Token-weighting is deliberate: it answers *"how much of the published footprint
rests on measured inputs?"*, which is what a reader should trust — a single
high-traffic fallback model matters far more than several tiny measured ones. A
count companion (`models_measured` / `models_total`, `grid_live_models`) is also
published for legible UI copy. This block introduces **no new sourced numbers**;
it only reports what the per-row flags already imply.

### 4b. Provenance & verifiability (`sources.yaml` + gate, methodology v0.4.0)

CLAUDE.md's "no magic numbers" rule is now **machine-enforced**. `data/provenance/sources.yaml`
is a structured registry — one entry per source (`id`, `title`, `publisher`, `url`, `version`,
`accessed`, `locator`, `license`, `claim`) — and **every** numeric record in `data/**/*.yaml`
carries a `source_id` (or `source_ids`) that must resolve to a registry `id`. The build gate
`pipeline/provenance.py` (`python -m pipeline.provenance`, also a pytest test and a CI step)
**fails on any unsourced number**, so no later phase can silently introduce one. This is the
backbone of the project's *可被验证 / 溯源* (verifiable / traceable) goal.

The published `latest.json` is self-describing: it carries a top-level `sources[]` array — the
compact subset of the registry actually referenced that day — and every model row carries
`energy_source_id` and `grid_source_id`, so each figure traces to its source. To respect source
copyright, each registry `claim` is a **short paraphrase plus a locator**, never reproduced
source text (the gate caps claim length).

## 5. Scope & limitations

- **Coverage is partial.** Only OpenRouter-visible API traffic;
  `modeled_traffic_fraction` quantifies the modeled share each day (the `other`
  aggregate row is the unmodeled denominator, never dropped or merged).
- **Tokenizer non-comparability (L-TOKENIZER).** Token counts come from each
  provider's own tokenizer and are **not directly comparable** across rows; any
  cross-model token sum or per-token efficiency carries this caveat.
- **Closed-model opacity.** Parameters, hardware, and DC locations are
  undisclosed; closed rows use EcoLogits-class assumptions, the widest ranges,
  and the `CLOSED_MODEL_ASSUMED` flag.
- **Grid timing.** Annual factors are averages; real-time intensity swings
  widely by hour/fuel mix. Live Electricity Maps is preferred; the annual table
  is the labelled fallback (`grid_source`).

## 6. Sensitivity Analysis (PUE and Load)

Given the uncertainty in hardware deployment, sensitivity analysis is required:
- **PUE (Power Usage Effectiveness)**: A best-in-class data center (e.g., Google) may operate at PUE ~1.1, while older or less optimized facilities run closer to 1.5. This creates a ~36% variance in total CO₂ estimation.
- **Utilization/Load**: Servers running at high utilization are more energy-efficient per token. Our base ranges incorporate variations from 50% to 100% load.

## 7. EU Context & ESG Reporting Relevance (CSRD / EU Taxonomy)

This project aligns with emerging European sustainability frameworks:
- **CSRD / ESRS (E1 Climate Change)**: Estimates here support the calculation of Scope 3 emissions (purchased services/cloud computing) required under the Corporate Sustainability Reporting Directive.
- **EU Taxonomy (DNSH)**: Evaluating whether AI workloads "Do No Significant Harm" to environmental objectives requires granular, workload-level transparency of energy intensity.
- **Energiewende & Regional Grids**: By utilizing *Electricity Maps*, the index captures the stark contrast between grid zones. For example, inference routed to France (nuclear-heavy, ~50gCO₂/kWh) versus Germany (coal/renewables mix, ~300gCO₂/kWh) yields vastly different footprints for the exact same LLM query.

## 8. Market-based vs location-based (GHG Protocol Scope 2)

- **Location-based** uses the physical grid intensity of the serving region
  (what this MVP reports).
- **Market-based** reflects contractual instruments (PPAs/RECs) a provider buys,
  which can drive reported intensity toward zero — an *accounting* outcome, not a
  change in the electrons consumed.

The two can differ by an order of magnitude. Reporting both, and the
substitution scenarios, is **Phase 6** work; this MVP reports location-based
only and flags the distinction so it is never misread as physical reality.

## 9. Electricity Maps licensing decision (L-EM-FREE)

The Electricity Maps free tier is **non-commercial**. Decision for this project:
operate in **non-commercial academic / portfolio mode**, and degrade gracefully
to the committed annual-factor table (`data/grid/annual_factors.yaml`) whenever
live data is unavailable or the zone is unsupported — recording `grid_source`
per row. If the project were ever used commercially, a paid Electricity Maps
plan (or annual-factor-only mode) would be required. This decision is restated
in `README.md`.

## 10. Required attributions

- `Source: OpenRouter (openrouter.ai/rankings), as of {data_date}` — stored in
  `source_citation` and shown in the UI (L-OR-CITATION).
- Grid intensity: Electricity Maps (live) + Ember / EPA eGRID (annual fallback),
  recorded per row via `grid_source`.
- Energy: Hugging Face **AI Energy Score** + **EcoLogits** (E-METHOD).
