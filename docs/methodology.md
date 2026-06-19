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

The exact **system boundary** — what is counted in, what is out, and why — is
documented in [`BOUNDARY.md`](BOUNDARY.md). Principles for impartial
cross-model comparison (open vs. closed asymmetry, tokenizer non-comparability,
origin neutrality, rank stability under alternative assumptions) are in
[`FAIRNESS.md`](FAIRNESS.md).

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
  two sum to 1.0. (L2 note: currently 0.0 for published series — see §11a.)

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

**Scope-2 dual reporting (GHG Protocol) & ESRS-E1 mapping (P7):** The committed
`data/output/esg_export.json` (and the matching client-side builder) directly
exposes `totals.co2_kg` as the location-based Scope-2 total and `totals.co2_kg_market`
as the market-based Scope-2 total, each as `{low, mid, high}` ranges. An
ESRS-E1-flavored line item is provided for CSRD reporting use. The full project
scope/uncertainty statement is embedded verbatim inside the export artifact and
is non-removable. No new numeric values are invented — the fields are projections
of the already-computed dual totals that the pipeline has carried since Phase 6b.

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

## 11. Reproduce & verify

A published run for data date `D` is accompanied by a frozen snapshot of its raw inputs under `data/raw/snapshots/{D}/` (the exact OpenRouter rankings response, each grid region response or the annual-factor record that was used, and a `resolved.json` capturing the `data/**/*.yaml` versions via repo git SHA at build time). Secrets and auth headers are never present in snapshots. `make verify {date}` re-executes the pipeline strictly from that snapshot (no network) and asserts that the emitted `data/output/history/{date}.json` is byte-identical to the committed golden (ignoring only the volatile `generated_at` timestamp). `data/output/manifest.json` records per-date `sha256:` checksums over every snapshot input file plus the final output, the code git SHA, methodology version, and tool versions; a third party can therefore independently confirm integrity. All dependencies are pinned via `uv.lock`.

```bash
git clone https://github.com/wyl2607/llm-carbon-index.git
cd llm-carbon-index
uv sync
make verify 2026-06-14  # expect PASS
```

## 11a. Pipeline long-termism (L2–L4 audit items)

**L2 — Live grid honesty resolution.**  
`grid_live_fraction` (and `grid_live_models`) is 0.0 in every committed history golden and in the reproducibility harness. `pipeline/grid.py` *does* implement the live Electricity Maps fetch (guarded by `ELECTRICITYMAPS_API_KEY` + zone mapping from annual_factors.yaml; falls back on any failure including missing key). When live succeeds the row receives `grid_source: "electricity_maps_live"`, `grid_source_id: "GRID-EM-LIVE"`. However, the runs that produce published goldens (and `make verify`) never supply the key and never perform network calls (snapshots replay frozen annual values). Therefore the published metric honestly reports 0 % live today; it is not a silent/wrong claim. Annual fallback is always explicitly recorded per row (`grid_source`, `grid_source_id`, `FALLBACK_GRID_ANNUAL` flag in estimates). Live activation would snapshot a time-varying value at publish instant; that is feasible for ad-hoc runs but outside the current reproducibility contract for the committed series. (See also CLAUDE.md Electricity Maps rule and `pipeline/precision.py` / `grid.py` L2 notes.)

**L3 — History retention / compaction policy.**  
- Full `history/{YYYY-MM-DD}.json` files (complete with per-model detail) are retained *indefinitely* for all published dates. This is required for `pipeline.verify` (every golden must be replayable) and for audit. No code in `pipeline/` deletes history entries.  
- For cheap multi-year daily cadence: `write_outputs` maintains a compact sidecar `history/index.json` containing only the lightweight list of `{"data_date", "totals"}` excerpts. `write_timeseries()` prefers the index (fast load, no parsing of large `models[]` arrays) and falls back to glob+extract only when the index is absent.  
- Retention policy is documented here; the index strategy keeps rebuild cost independent of history depth while preserving 100 % of committed detail. (Implementation in `pipeline/output.py`, `config.py`.)

**L4 — Schema/methodology versioning + migration rule.**  
`METHODOLOGY_VERSION` is the single source in `pipeline/__init__.py`.  
Methodology or output-schema affecting changes (Phase 6J-class: new required fields, precision semantics, range propagation rules, source labelling, etc.) **MUST**:
1. Bump `METHODOLOGY_VERSION` appropriately.
2. Regenerate the affected `data/output/history/{D}.json` *and* its `data/raw/snapshots/{D}/` in the *same commit*.

`make verify` (and the explicit guard in `pipeline/verify.py:verify_date`) will fail on version mismatch because `_strip_volatile` removes only `generated_at` and the full doc (incl. `methodology_version`) is compared. This rule is the enforcement mechanism — goldens always describe the version that produced them.

## 12. Related work & literature positioning

Strubell et al. (2019) delivered the first systematic quantification of NLP training energy and carbon footprints and established the scholarly expectation that energy consumption must be reported [1]. This project extends that "report your energy" norm from the training regime to live, disaggregated *inference* traffic via an OpenRouter-driven public dashboard.

Luccioni et al. (2023), in the BLOOM full-lifecycle assessment, produced the first detailed empirical split of dynamic, idle and embodied emissions for a 176 B public model, finding embodied carbon at ~22 % of the total [2]. The embodied term introduced in this project's v0.2 (C-EMBODIED) is deliberately consistent with the 22–35 % range reported across that study and follow-on work.

Faiz et al. (2023) presented LLMCarbon, an end-to-end operational-plus-embodied projection model for dense and MoE architectures that achieved ~8 % validation error against measured workloads, with embodied shares of 24–35 % [3]. The present effort is narrower—focused on inference flow and real-time public rankings—and is therefore complementary; a hybrid cross-validation between the two frameworks is identified as a future opportunity.

Hugging Face's AI Energy Score offers a standardized, CodeCarbon-backed inference energy benchmark [4]; the project consumes these figures directly as the primary measured anchor for its E-series assumptions. EcoLogits supplies an independent GenAI API inference estimator used as the E-METHOD baseline and for closed-model coverage [5]. CodeCarbon is the common local measurement substrate underlying several of the cited benchmarks [6].

Jegham et al. (2025) benchmarked energy, water and carbon across more than thirty models under realistic infrastructure conditions and documented that long-prompt workloads can exceed 30+ Wh per query [7]. Their findings directly motivate the deliberately wide uncertainty ranges adopted throughout this estimation pipeline.

The works above supply the empirical grounding and modeling precedent for the equations, ranges and provenance rules used here. Important gaps remain unclosed: dynamic batching and instantaneous utilization regimes, MoE routing overhead, and a standardized, provider-auditable methodology for embodied-carbon factors. These limitations are acknowledged as explicit future-work items. The dashboard produces estimates with uncertainty ranges; it makes no claim to direct measurement precision.

## 13. References

[1] Strubell, Ganesh, McCallum (2019). Energy and Policy Considerations for Deep Learning in NLP. https://arxiv.org/abs/1906.02243
[2] Luccioni, Viguier, Ligozat (2023). Estimating the Carbon Footprint of BLOOM. https://arxiv.org/abs/2211.02001
[3] Faiz et al. (2023). LLMCarbon: Modeling the End-to-End Carbon Footprint of LLMs. https://arxiv.org/abs/2309.14393 (code: https://github.com/SotaroKaneda/MLCarbon)
[4] Hugging Face AI Energy Score. https://huggingface.co/spaces/AIEnergyScore/Leaderboard
[5] EcoLogits. https://ecologits.ai/
[6] CodeCarbon. https://github.com/mlco2/codecarbon
[7] Jegham et al. (2025). How Hungry is AI? Benchmarking Energy, Water, and Carbon Footprint of LLM Inference. https://arxiv.org/abs/2505.09598
[8] Li et al. (2023). Making AI Less "Thirsty": Water Footprint of LLMs. https://arxiv.org/abs/2304.03271
[9] Google (2025). AI and Energy: A Technical Note on Inference Energy. https://arxiv.org/abs/2508.15734

## 14. Literature cross-validation & citations (Phase 6P)

This project performs a structured, automated cross-validation of its per-query energy (and derived CO₂) bands against independently published literature anchors. The harness lives in `pipeline/validate_literature.py` and is driven by the machine-readable registry `data/validation/literature_anchors.yaml`.

### Anchors and provenance
- Every anchor records an exact published figure (or short-prompt representative) as `{low, mid, high}` tolerance band plus (when available) a `co2_g_per_query` mid.
- Every numeric value is accompanied by a `source_id` that **must** resolve to an entry in `data/provenance/sources.yaml` under the distinct `LIT-*` namespace (BLOOM, Gemini, OpenAI blog claim, Jegham). The test gate `tests/test_literature_anchors.py` asserts resolvability for all anchors.
- `LIT-OPENAI` (0.34 Wh "average query", Altman 2025-06-10 blog) is explicitly marked `verified: false` and is carried only as a report-only soft anchor; no hard band assertion is executed against it until a peer-reviewed source supersedes the blog post.

### Model matching and per-query derivation
For each anchor the harness:
1. Uses the `model_match` spec (`params_b_gte` + `dense`, `family`, etc.) to locate comparable rows in the day's `latest.json` models, consulting `model_crosswalk.yaml` for `params_b` / `active_params_b` when needed.
2. When no exact high-parameter dense model is present in the index, it falls back to the corresponding `parameter_class_fallback` band from `intensity.yaml` (large-class for BLOOM-scale workloads). This guarantees a usable band even as the model catalogue evolves.
3. Scales the selected `wh_per_output_token` Range by the anchor's documented `query_output_tokens` (representative output-side tokens for that literature workload definition) to produce a project `band` in Wh/query.
4. Where the anchor supplies a grid/PUE-sensitive `co2_g_per_query`, a parallel CO₂ band is derived using the matched model's (or default) `pue` and `carbon_intensity_gco2_kwh`.
5. Containment is tested as `band.low <= anchor_mid <= band.high`. A flag (out-of-band) is recorded as an explicit finding, never silently accepted.

The emitted `data/output/validation.json` contains one record per anchor with `{id, anchor, band, co2_band?, status, source_id, verified, used, note}`.

### Why the harness matters
Literature numbers differ for well-understood reasons:
- BLOOM (Luccioni et al. arXiv:2211.02001 / JMLR 2023) is all-in (dynamic + idle + embodied) on a 176 B dense model on French grid hardware; our operational per-token ranges deliberately exclude persistent idle, producing a comparable but narrower figure.
- Google Gemini report (arXiv:2508.15734, Aug 2025) reports a low median text-prompt value (0.24 Wh) on highly optimized serving stacks; our closed-model rows use wide `parameter_class_fallback` bands precisely because parameters, hardware, and DC efficiency are undisclosed.
- Jegham et al. (arXiv:2505.09598) document both short-query (0.42 Wh) and long-prompt extremes (29 Wh). Our harness uses a typical-query scaling factor; long-prompt outliers are expected to flag and are surfaced for readers.
- Strubell et al. (arXiv:1906.02243) established the original call for energy reporting that this work extends from training to public inference traffic.
- LLMCarbon / Faiz et al. (arXiv:2309.14393) supplied end-to-end modeling precedent (operational + embodied) whose 24–35 % embodied share informed C-EMBODIED.
- HF AI Energy Score and EcoLogits remain the primary measured inputs (E-series); the literature harness provides an external sanity layer rather than replacing them.

Out-of-band verified anchors are retained in `validation.json` and can be inspected on every run. They are design signals (e.g. "our conservative closed fallback exceeds a vendor's reported median") rather than failures. The harness runs in the test suite (`pytest tests/test_literature_anchors.py`) and can be invoked standalone; any single file read error skips only the affected anchor.

## 15. vNext depth additions (tiering, physical embodied, MoE energy, regime, ESG export)

**Indistinguishable tiers (6m).** Because the per-model CO₂ ranking is unstable under defensible alternative assumptions (see `totals.fairness.rank_stability`), the index groups models whose `{low, high}` CO₂ ranges overlap into indistinguishable *tiers* (`pipeline/fairness.py:indistinguishable_tiers` → `totals.tiers`). Tier 1 is the lowest-impact band; tiers are the headline and exact ranks are secondary. With the current all-fallback data every top model collapses into a single tier — an honest reflection of the ~10–16× uncertainty band, not a defect.

**Physical embodied cross-check (6n).** Alongside the ratio-of-operational embodied proxy (C-EMBODIED), a second physically grounded estimator (`pipeline/embodied.py`) follows LLMCarbon: `embodied_kg = die_area_cm² × CPA_kgCO₂/cm² × (GPU_hours / lifetime_hours) / utilization`, with GPU-hours derived from operational energy ÷ per-GPU power. Hardware constants (die area, CPA, TDP, lifetime, utilization per GPU class) are sourced in `data/assumptions/hardware_embodied.yaml` under the `H-*` namespace. Both estimators are reported; their spread is the embodied method-uncertainty.

**MoE-aware energy (6q).** Inference energy scales with *active*, not total, parameters. The parameter-class fallback band is keyed on `active_params_b` from `model_crosswalk.yaml` (falling back to total `params_b` only when active is absent), so a high-total / low-active MoE model lands in the small-active energy class.

**Dynamic regime / batching (6o).** Fixed Wh/token ignores batch size, KV-cache, and prefill/decode nonlinearity. A sourced regime multiplier (`data/assumptions/regime_factors.yaml`, `R-*` namespace) lets short→long prompt and low→high batch be tuned; the relationship is monotonic (longer prompt / lower batch → higher energy), exposed interactively via the What-If simulator sliders.

**ESG / CSRD Scope-2 export (6r).** `pipeline/output.py` emits `data/output/esg_export.json` mapping location-based (`totals.co2_kg`) and market-based (`totals.co2_kg_market`) figures to GHG-Protocol Scope-2 dual reporting plus an ESRS-E1-flavored line item. The project scope/uncertainty caveat is embedded verbatim and non-removable in every exported artifact; no new numbers are created. A download surface is available in the web UI.

This mechanism keeps the project honest against the external literature while respecting the "no silent 0 / no magic numbers / ranges end-to-end" invariants.

## 16. Rightsizing & efficiency frontier (methodology v0.8.0)

The base model answers *which* models emit the most; this view answers whether that emission was
**necessary** — how much OpenRouter-visible inference CO₂ is attributable to running a more capable
(and more energy-intensive) model than the delivered task quality required. It is the carbon analog of
Artificial Analysis's intelligence-vs-price frontier. Implementation: `pipeline/frontier.py`
(`compute_frontier` / `annotate_models` / `compute_fleet_rightsizing`), wired into `build_output`.

**The two axes.**
- **X — capability**: the Artificial Analysis Intelligence Index v4.1 (0–100 composite), a pinned, cited
  snapshot in `data/model_capability.yaml` (source `Q-AAII-V41`, accessed 2026-06-19; the index drifts
  weekly → snapshot, not a live pull). Each value is transcribed from the public leaderboard at the
  model's **maximum reasoning effort** (the configuration AA ranks on); none is estimated. Scores are
  mapped to each OpenRouter slug via the `capability_key` field in `data/model_crosswalk.yaml`. Models
  with no published score get `capability_index: null` + flag `FALLBACK_CAPABILITY` and are excluded
  from frontier definition. LMArena Elo may be stored as an optional cross-check but is **not** the axis.
- **Y — energy intensity**: `energy_wh_per_mtok = wh_per_output_token × 1e6`, carried as a
  `{low, mid, high}` band. The frontier is a property of the *model*, not of how much it is used, so
  traffic enters only in the fleet roll-up. The frontend plots this on a log scale.

**Frontier definition (Pareto).** In the plane (capability ↑ better, intensity ↓ better) model **M**
is on the frontier iff no other *eligible* model **N** satisfies
`capability_N ≥ capability_M AND intensity_N ≤ intensity_M` with at least one strict. Eligible to
**define** the frontier means high-confidence only: `energy_source == "ai_energy_score"` **and**
`capability_index != null`. Fallback-energy models are still plotted (greyed) and still get a gap, but
they carry `LOW_CONFIDENCE_GAP` and never define the line. The frontier is computed on **mid** intensity.

**Rightsizing gap (per model).** Reference **F** = the frontier model with the *minimum* mid-intensity
among frontier models that deliver *at least* M's capability. The gap band clamps the low end at 0:

```
gap_mid  = (e_M.mid  − e_F.mid ) / e_M.mid
gap_low  = max(0, (e_M.low  − e_F.high) / e_M.low )
gap_high =        (e_M.high − e_F.low ) / e_M.high
```

A frontier member, or any model already at/under the frontier for its tier, gets gap `{0,0,0}`. The
single most capable model has no reference (`rightsizing_gap_pct: null`, flag `NO_FRONTIER_REFERENCE`):
you cannot rightsize down without losing capability — that is not waste.

**Fleet realized waste (the headline).** Avoidable operational CO₂ is the model's own location-based
CO₂ scaled by its gap, band-to-band (unit-safe; `co2_kg` already encodes traffic, grid intensity and
PUE, so region/grid/PUE are held constant automatically):

```
avoidable_co2_kg_M.x   = co2_kg_M.x × rightsizing_gap_pct_M.x        for x in {low, mid, high}
fleet_avoidable_co2_kg = Σ avoidable_co2_kg_M   over models with a defined, high-confidence gap
fleet_avoidable_pct    = fleet_avoidable_co2_kg / total_co2_kg
```

Low-confidence (fallback-energy) models are excluded from the headline by default (UI toggle to
include). This supersedes the spec's earlier token-based `avoidable_kwh` draft (see
`specs/efficiency-frontier.md` §5); the executable contract is `tests/test_frontier.py`.

**What this does NOT claim (scope discipline).**
- **Capability ≠ task fitness.** A composite benchmark score is not a guarantee that a smaller model
  fits a specific user's task. The gap is an *opportunity ceiling*, not a recommendation to switch.
- **Region/grid/PUE held constant.** This view does not combine with grid-shifting; that is a separate
  lever and would be double-counted if merged.
- **Built mostly on estimated energy.** For `parameter_class_fallback` models the gap is low-confidence
  and excluded from the headline by default.
- **Ignores substitution friction** — latency, context window, modality, tool support, provider
  availability, price. A frontier-equivalent model may be unusable for reasons outside this plane.
- **OpenRouter-visible slice only** (existing scope guard; consumer apps excluded).
