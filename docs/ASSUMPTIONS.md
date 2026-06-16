# docs/ASSUMPTIONS.md

Every number this project relies on lives here with a source, a value/range, and an uncertainty note. **When you introduce any new constant, coefficient, ratio, or region factor, add an entry in the same commit.** This file is the backbone of the methodology chapter / thesis.

Each entry: `ID · statement · value(range) · source · uncertainty · where used · last reviewed`.

**Machine-enforced since Phase 6G:** every number in `data/**/*.yaml` must carry a `source_id`
that resolves to an entry in `data/provenance/sources.yaml`, checked by
`python -m pipeline.provenance` in CI and pytest. The IDs in this file are the human-readable
companions of those registry entries — keep the two in step when adding a constant.

---

## A — Modeling assumptions

### A1 — Model subset (MVP)
Start with OpenRouter top-list **open** models that have AI Energy Score data, plus 1–2 **closed** models via EcoLogits. Listed in `model_crosswalk.yaml`. Expanded in later phases. Phase 6j: top-traffic open models (minimax-m3, deepseek v4 flash/pro by 2026-06-14 total_tokens) now carry explicit measured entries in intensity.yaml (ai_energy_score) where class data is defensible; energy_source flips and energy_measured_fraction reflects their token share. Models without defensible measured data remain on parameter_class_fallback. *Uncertainty:* coverage is partial; `totals.modeled_traffic_fraction` reports how much of the day's traffic is actually modeled.

### A2 — Input:output token ratio
`rankings-daily` returns **combined** prompt+completion tokens; inference energy scales mainly with **output** tokens. Default split **80:20 (input:output)** → `est_output_tokens = total_tokens × 0.20`.
- *Status:* first verify whether the API exposes a completion-only field; if so, use it and retire this assumption.
- *Source:* default informed by OpenRouter's published usage study (refine with their reported ratios). *Uncertainty:* high; treat as a sensitivity-analysis axis in the methodology. *Where used:* `pipeline/tokens.py`.

### A3 — Data-center region per model
One assumed region per provider (`closed_models.yaml`), used to fetch grid intensity. *Source:* public provider/cloud disclosures + reasonable inference. *Uncertainty:* high for closed providers (location undisclosed). Flag rows with `CLOSED_MODEL_ASSUMED`.

### A4 — Power Usage Effectiveness (PUE)  *(revised v0.2: now a band, not a point)*
PUE is applied as a **Range `{low 1.1, mid 1.25, high 1.56}`**, not a flat scalar, because OpenRouter routes to a *mix* of hyperscaler and non-hyperscaler backends and a single facility PUE is unknowable per request.
- *Values:* low **1.1** (Google/hyperscaler fleet reporting); mid **1.25** (typical modern facility); high **1.56** (Uptime Institute Global Data Center Survey 2024 industry average, flat for 5 consecutive years).
- *Source:* Uptime Institute Global Data Center Survey 2024; Google environmental/PUE reporting. *Uncertainty:* real fleet PUE 1.1–1.6+. A known provider PUE (from `closed_models.yaml`) centres the band's mid; low/high keep the global bounds. *Where used:* `methodology_factors.yaml` `pue`; `estimate.py`; `carbon.co2_kg` (accepts a Range). *Last reviewed:* 2026-06-16.

### E-PREFILL — Input (prefill) token energy  *(new v0.2)*
Inference energy depends on **both** input and output tokens. The prefill phase
(processing the prompt) is **compute-bound and parallel** (high hardware
utilisation), so per token it is *cheaper* than the memory-bandwidth-bound decode
phase — but **not zero**. v0.1 modelled only output tokens, discarding ~80% of
tokens as energy-free; v0.2 adds a prefill term.
- *Value:* `wh_per_input_token = alpha × wh_per_output_token`, with **alpha = {low 0.1, mid 0.2, high 0.3}**. `input_tokens = total − est_output_tokens`.
- *Source:* prefill/decode energy decomposition in LLM-inference energy studies — arXiv:2507.11417 (Quantifying Energy & Carbon of LLM Inference via Simulations); TokenPowerBench arXiv:2512.03024. *Uncertainty:* very high (no public per-model prefill:decode energy split); treat alpha as a sensitivity axis. *Where used:* `methodology_factors.yaml` `prefill_alpha`; `tokens.input_tokens`; `energy.energy_kwh`. *Last reviewed:* 2026-06-16.

---

## E — Energy intensity (Wh per output token)

These feed `data/energy/intensity.yaml`. Each model/class entry must cite how its Wh/output-token range was derived.

- **E-METHOD** — Two primary sources: (1) **AI Energy Score** (Hugging Face/Salesforce/CMU) — measured Wh per 1000 standardized queries; back out per-output-token by dividing by the assumed mean output tokens per benchmark query (record the assumed value). (2) **EcoLogits** — per-request impacts modeled from provider + model + output-token count + latency (LCA-based, ISO 14044). For closed models, parameter counts are estimates → carry a wide range. *Divisor (Phase 6j):* 150 output tokens per standardized query (mid of observed ~80-220 range in task samples; recorded here as the E-METHOD assumption for all ai_energy_score back-outs). *Uncertainty:* note that a single chat-style query has been estimated anywhere from ~0.3 Wh (Google) to ~1.8–7 Wh (EcoLogits) depending on assumptions — your ranges should reflect that spread. *Where used:* derivation notes for all E-*-measured intensity entries; test assertions.
- **E-CLASS-\*** — Parameter-class fallback coefficients for unknown/uncovered models, keyed by active-parameter band (P5: selection uses `active_params_b` from crosswalk with fallback to `params_b`; MoE energy scales on active not total params). Source + derivation recorded per band. *Uncertainty:* very high; these exist so the pipeline degrades gracefully, not to be precise.
- **E-{MODEL}** — One entry per modeled model as it's added.
- **E-IDLE** — Optional always-on/idle server energy term (kWh per day per attributable slice). Added only where a defensible per-model or strong class analogue exists (never for pure fallback). See rationale in BLOOM arXiv:2211.02001 gap (~3.96 Wh/query all-in vs ~1.25 token-only; residual after E-PREFILL + C-EMBODIED accounts for idle + overhead). Value is model-specific in intensity.yaml (with idle_source_id = E-IDLE); multiplied by share_of_day in energy_kwh. *Uncertainty:* very high (allocation of shared always-on capacity to a specific model's visible traffic slice). Default None/0 in energy_kwh for models without entry. *Where used:* selective intensity models + energy.energy_kwh optional path. *Last reviewed:* 2026-06-16.

### E-CLASS-SMALL (Phase 2 seed; P5 MoE update)
- **E-CLASS-SMALL** — 0.0005–0.0012–0.0025 Wh per output token for models with active params ≲15B. *Source:* informed by AI Energy Score v2 small-model measurements + EcoLogits ranges for 7-13B class; widened ±~2x for benchmark-to-prod variance, tokenizer diffs, and measurement uncertainty. *Uncertainty:* high (class band, not per-model). *Where used:* intensity.yaml parameter_class_fallback first band; fallback path for unknown models or explicit "parameter_class_fallback" in crosswalk. *P5 (active-param MoE):* band selection in `pipeline/energy.py` (`_choose_fallback_band`) now strictly keys on `active_params_b` from crosswalk (falls back to `params_b` only if active absent). Example: 230B-total / 10B-active MoE correctly maps to SMALL class (not LARGE by total size). See C-PARAMS-PUBLIC. *Last reviewed:* 2026-06-16.

### E-CLASS-LARGE (Phase 2 seed; P5 MoE update)
- **E-CLASS-LARGE** — 0.002–0.005–0.012 Wh per output token for models with active params up to ~100B. *Source:* informed by AI Energy Score v2 + EcoLogits 30-100B class measurements; upper widened for closed-model opacity (no public params). *Uncertainty:* very high. *Where used:* intensity.yaml large band; default conservative choice for UNKNOWN_MODEL. *P5 (active-param MoE):* selection now uses active_params_b preferentially (e.g. Nemotron 550B-total/55B-active or 120B/12B MoE variants fall here; 12B-active lands in SMALL). Unknowns without size info still take largest band. *Last reviewed:* 2026-06-16.

### E-MINIMAX-M2.5 (Phase 2 A1 seed)
- **E-MINIMAX-M2.5** — 0.0008–0.0015–0.003 Wh per output token. *Source:* AI Energy Score v2 for ~10B active MoE-class (MiniMax M2.5); range widened for production variance. *Uncertainty:* medium (measured for open model). *Where used:* crosswalk + intensity.yaml; cn-north grid region. *Last reviewed:* 2026-06-15.

### E-LLAMA-31-8B (Phase 2 A1 seed)
- **E-LLAMA-31-8B** — 0.0004–0.0009–0.0018 Wh per output token (Llama 3.1 8B). *Source:* AI Energy Score v2 7-13B band; slightly tighter low because small dense model. *Uncertainty:* medium. *Where used:* intensity.yaml. *Last reviewed:* 2026-06-15.

### E-QWEN25-72B (Phase 2 A1 seed)
- **E-QWEN25-72B** — 0.0018–0.0040–0.0090 Wh per output token (Qwen2.5 72B). *Source:* AI Energy Score v2 informed for 70B dense; scaled up from 8B band + published scaling observations. *Uncertainty:* high (no direct HF measurement for this exact checkpoint at seed time). *Where used:* intensity.yaml; cn-north grid. *Last reviewed:* 2026-06-15.

### E-MISTRAL-7B (Phase 2 A1 seed)
- **E-MISTRAL-7B** — 0.0005–0.0013–0.0026 Wh per output token. *Source:* AI Energy Score v2 small band applied to Mistral 7B EU model. *Uncertainty:* medium. *Where used:* intensity.yaml; europe-west grid. *Last reviewed:* 2026-06-15.

### E-DEEPSEEK-67B (Phase 2 A1 seed)
- **E-DEEPSEEK-67B** — 0.0015–0.0035–0.0080 Wh per output token. *Source:* AI Energy Score v2 informed for 60-70B class (DeepSeek dense/MoE). *Uncertainty:* high. *Where used:* intensity.yaml; cn-north. *Last reviewed:* 2026-06-15.

### E-CLAUDE-35-SONNET (Phase 2 A1 seed, closed)
- **E-CLAUDE-35-SONNET** — 0.0025–0.0060–0.0150 Wh per output token. *Source:* EcoLogits LCA-based estimate for frontier closed model (Claude 3.5 Sonnet); range >2× wider than open 70B to reflect undisclosed parameter count, hardware, and datacenter efficiency. *Uncertainty:* very high. *Where used:* intensity.yaml (ecologits tag); us-east grid + CLOSED_MODEL_ASSUMED. *Last reviewed:* 2026-06-15.

### E-MINIMAX-M3 (Phase 6j)
- **E-MINIMAX-M3** — 0.0008–0.0015–0.003 Wh per output token (same band as E-MINIMAX-M2.5). *Source:* AI Energy Score v2 MoE ~10B active class; applied to current top-traffic MiniMax M3 via family continuity (no evidence of regression in public cards). *Uncertainty:* medium (class match). *Where used:* intensity.yaml for minimax/minimax-m3 (norm); top token share contributor on 2026-06-14. *Last reviewed:* 2026-06-16.

### E-DEEPSEEK-V4-FLASH (Phase 6j)
- **E-DEEPSEEK-V4-FLASH** — 0.0015–0.0035–0.0080 Wh per output token (same band as E-DEEPSEEK-67B). *Source:* AI Energy Score v2 60-70B dense/MoE class; applied to DeepSeek V4 Flash (high-traffic open) by family. *Uncertainty:* high (flash variant may be more efficient; conservative use of full class band). *Where used:* intensity.yaml; second-highest open token volume on 2026-06-14. *Last reviewed:* 2026-06-16.

### E-DEEPSEEK-V4-PRO (Phase 6j)
- **E-DEEPSEEK-V4-PRO** — 0.0015–0.0035–0.0080 Wh per output token (same band as E-DEEPSEEK-67B). *Source:* AI Energy Score v2 60-70B dense/MoE class; applied to DeepSeek V4 Pro by family. *Uncertainty:* medium. *Where used:* intensity.yaml; significant open token share. *Last reviewed:* 2026-06-16.

### E-IDLE (Phase 6j; wired into estimate Phase 7)
- **E-IDLE** — idle_kwh_per_day band {3000, 8500, 18000} kWh/day for a comparable-large model deployment slice, applied with **idle_share_of_day = 0.2**. *Source:* BLOOM all-in vs token-only gap (Luccioni et al. arXiv:2211.02001: 914 kWh / 230,768 queries yields ~3.96 Wh/query total; ~1.25 attributed to per-token only leaves residual for idle + system factors after E-PREFILL/C-EMBODIED). Converted to daily kWh for representative query volume; the 0.2 share is **calibrated** so the implied all-in Wh/query band contains BLOOM's ~3.96 figure (see the idle regression in test_energy.py). *Uncertainty:* very high (slice allocation approximate; only attached to models with a strong class analogue). *Where used:* intensity.yaml (deepseek/deepseek-chat carries idle_kwh_per_day + idle_share_of_day + idle_source_id); resolved by `energy.idle_for_slug` and added in `estimate.py` (flagged **IDLE_INCLUDED**); models without idle data take the pure-dynamic path (no silent idle). *Last reviewed:* 2026-06-16.

## R — Dynamic regime / batching / prompt-length (P6)
P6 introduces a tunable regime multiplier (replacing fixed Wh/token assumption) to capture batch size, utilisation, KV-cache pressure and prefill/decode nonlinearity that a static per-output-token figure ignores. The existing prefill_alpha (E-PREFILL) is now one axis inside broader regime.

- **R-REGIME-\*** — Six discrete regime bands (short/medium/long prompt × high/low batch). Each is a {low,mid,high} multiplier on the reference per-output-token energy from intensity (reference ≈ medium-prompt + high-batch/utilisation). Applied in `energy_kwh(regime_multiplier=...)` (Range multiply, end-to-end) and in web `scenario.ts` what-if math. *Source:* synthesis anchored to Jegham et al. (arXiv:2505.09598: long-prompt workloads reach ~29 Wh/query vs short ~0.42 Wh across >30 models) + prefill/decode asymmetry (arXiv:2507.11417 Quantifying Energy & Carbon...; TokenPowerBench arXiv:2512.03024) + utilisation observations from inference benchmarking. Multipliers set conservatively so scaled query energy (E-METHOD ~150 output tok) remains inside / approaches published extremes without fabrication. *Monotonicity (required):* strictly longer prompt class or lower batch class produces higher multiplier band (no overlap inversion). *Uncertainty:* very high (workload-dependent; not per-model). *Where used:* `data/assumptions/regime_factors.yaml`; `pipeline/energy.py`; `web/src/lib/scenario.ts` + `scenario.test.ts`; WhatIfSimulator regime/prompt sliders. *Last reviewed:* 2026-06-16.

### R-REGIME-SHORT-HIGH
- short prompt (small input, light KV/prefill) + high batch (good amortisation, high util) → multiplier near or below 1.0 (slightly better than reference benchmark mix). R-REGIME-SHORT-HIGH.

### R-REGIME-SHORT-LOW / MED-LOW / LONG-HIGH / LONG-LOW
- Progressive increase: low batch raises cost via utilisation drop; long prompt raises via KV-cache residency + prefill share (input/output ratio nonlinearity). LONG-LOW is highest (worst-case low-util long-context). See regime_factors.yaml for exact bands; all R-* entries in sources.yaml.

---

## C — Physical / grid constants (seeded from Phase 0; keep citing)

- **C-ENERGY-LUCCIONI** — Per-query / per-token inference energy reference figures. *Source:* Luccioni et al., 2024 (inference energy benchmarking). *Where used:* energy intensity sanity checks.
- **C-ENERGY-DEVRIES** — AI/data-center energy demand framing. *Source:* de Vries, 2023. *Where used:* magnitude sanity checks, methodology context.
- **C-PUE** — see A4 (Google / Uptime).
- **C-GRID-EGRID** — US grid emission factors. *Source:* EPA eGRID2022. *Where used:* `annual_factors.yaml` US regions; Phase 0 grid constant.
- **C-GRID-US-EAST-380** (Phase 2 seed) — 380 gCO₂eq/kWh annual for "us-east" region key. *Source:* EPA eGRID2022 (U.S. average output emission rate). *Uncertainty:* annual average; real-time varies ~150-700+ depending on hour/fuel mix; live EM preferred when available. *Where used:* annual_factors.yaml us-east; grid fallback path; test fixtures. *Last reviewed:* 2026-06-15.
- **C-GRID-EUROPE-WEST-230** (Phase 2 seed) — 230 gCO₂eq/kWh for "europe-west". *Source:* Ember 2024 Europe West annual. *Uncertainty:* annual; hourly swings larger in winter. *Where used:* annual_factors.yaml; europe-west models. *Last reviewed:* 2026-06-15.
- **C-GRID-CN-NORTH-537** (Phase 2 seed) — 537 gCO₂eq/kWh for "cn-north". *Source:* Ember 2023 China (national annual). *Uncertainty:* high (China coal share varies by province/year); CN grid often higher-carbon than US/EU. *Where used:* annual_factors.yaml; all CN-origin models in A1 seed. *Last reviewed:* 2026-06-15.
- **C-GRID-EU-27-242** (Phase 2 seed) — 242 gCO₂eq/kWh for "eu-27". *Source:* Ember 2023 EU-27 annual. *Uncertainty:* annual aggregate; actual serving zone (DE/FR/NL) can be much lower. *Where used:* annual_factors.yaml as possible fallback. *Last reviewed:* 2026-06-15.
- **C-GRID-DEFAULT-400** (Phase 2 seed) — 400 gCO₂eq/kWh conservative composite. *Source:* round order-of-magnitude composite informed by Ember global 2023 mix of the seeded US/EU/CN factors (not a single official stat). *Uncertainty:* very high; only used if region key absent from annual_factors table. *Where used:* annual_factors.yaml "default" entry; grid.py last-resort path. *Last reviewed:* 2026-06-15.
- **C-GRID-\*** — Additional regions (e.g., Ember / IEA for EU/Asia) added as `annual_factors.yaml` grows. Prefer Electricity Maps live; these are the documented fallback.
- **C-GRID-EM-ZONES** (Phase 7) — Mapping from internal region keys to Electricity Maps **zone codes** for the live query, stored as `electricitymaps_zone` per region in `annual_factors.yaml`: `us-east → US-MIDA-PJM` (PJM Interconnection, Mid-Atlantic/eastern-US DC hub), `europe-west → IE` (Ireland, dominant western-EU cloud region), `cn-north → CN` (China aggregate). *Why:* internal keys like "us-east" are **not** valid EM zones, so the previous live query always 4xx'd and silently degraded to the annual factor. Regions with no representative single zone (e.g. the `eu-27` bloc, `default`) carry no mapping → live is skipped and the annual factor is used. *Uncertainty:* representative-zone choice introduces location uncertainty (a single zone stands in for a region); covered by the grid-intensity sensitivity sweep. *Where used:* `grid.em_zone_for_region` / `grid.carbon_intensity` live path. *Last reviewed:* 2026-06-16.

### C-EMBODIED — Embodied (manufacturing) carbon  *(new v0.2)*
v0.1 reported **operational** carbon only. v0.2 adds an **amortised embodied** term
(hardware manufacturing, the LCA component that EcoLogits — already cited — includes).
- *Value:* `co2_embodied = co2_operational × embodied_ratio`, with **embodied_ratio = {low 0.28, mid 0.39, high 0.54}**. Derived from literature putting embodied at **~22–35 % of *total* LLM carbon**, converted to a fraction of operational via `share/(1−share)` (22 %→0.28, 28 %→0.39, 35 %→0.54). `co2_total = operational + embodied`.
- *Source:* BLOOM LCA (~22 % embodied, Luccioni et al.); CarbonScaling arXiv:2508.06524; aging-aware embodied-amortisation arXiv:2501.15829. *Uncertainty:* high; embodied scaling with operational energy is a documented proxy for hardware-hours, not a measured per-model value. *Where used:* `methodology_factors.yaml` `embodied_ratio`; `carbon.embodied_co2_kg` / `carbon.total_lca_co2_kg`; emitted as `co2_kg_embodied` + `co2_kg_total`. *Last reviewed:* 2026-06-16.

---

## W — Water footprint  *(new v0.2)*

### W-WATER — On-site + off-site water split
v0.1 used a flat **1.5 L/kWh** WUE that conflated and undercounted off-site water.
v0.2 splits the footprint, both scaling with **facility** energy (IT × PUE):
`water_L = facility_energy_kWh × (onsite_WUE + offsite_EWIF)`.
- *Values:* **on-site WUE {0.3, 0.9, 1.8} L/kWh** (data-centre cooling evaporation) + **off-site EWIF {2.0, 3.14, 4.35} L/kWh** (water evaporated generating the electricity; US mean 3.14).
- *Source:* Li et al., *"Making AI Less Thirsty"* (arXiv:2304.03271 / CACM 2025); EWIF US power-generation water factors therein. *Uncertainty:* high; WUE varies spatially/temporally and by cooling tech. *Where used:* `methodology_factors.yaml` `water`; `water.water_liters`; emitted as `water_liters` (+ representative `wue`). *Last reviewed:* 2026-06-16.

---

## DC — Closed-model data-center assumptions (Phase 2)

These feed `data/assumptions/closed_models.yaml`. Every closed model row receives the `CLOSED_MODEL_ASSUMED` flag. Region + PUE are the dominant drivers of variance for opaque providers.

- **DC-OPENAI** (Phase 2 seed) — provider "openai", assumed_region "us-east", pue 1.2, cloud "azure", GPU H100 (representative). *Source:* public Azure region usage disclosures for OpenAI workloads + hyperscaler PUE reporting (Google 1.10 fleet; we use 1.2 conservative). *Uncertainty:* location undisclosed per request; actual serving region may be US-West, EU, or Asia depending on customer latency. *Where used:* closed_models.yaml; estimate.py pue override + region for gpt-4o. *Last reviewed:* 2026-06-15.
- **DC-ANTHROPIC** (Phase 2 seed) — provider "anthropic", assumed_region "us-east", pue 1.2, cloud "aws". *Source:* Anthropic AWS Bedrock / direct inference partnerships; conservative East-coast placement. *Uncertainty:* high (no public per-model DC map). *Where used:* closed_models.yaml for claude-3.5-sonnet. *Last reviewed:* 2026-06-15.
- **DC-GOOGLE** (Phase 2 seed) — provider "google", assumed_region "us-east", pue 1.25, cloud "google". *Source:* Google Cloud US regions for Gemini; Google publishes strong fleet PUE (~1.10) but we apply 1.25 to bound older/partner capacity. *Uncertainty:* high. *Where used:* closed_models.yaml for gemini-1.5-flash. *Last reviewed:* 2026-06-15.

### DC-TENCENT (Phase 3 expansion)
- **DC-TENCENT** — provider "tencent", assumed_region "cn-north", pue 1.3, cloud "tencent_cloud". *Source:* Public Tencent Cloud / Chinese provider DC characteristics; PUE 1.3 for non-hyperscaler CN cooling efficiency (A4). *Uncertainty:* high (undisclosed exact locations and workload routing). *Where used:* closed_models.yaml. *Last reviewed:* 2026-06-15.

### DC-STEPFUN (Phase 3 expansion)
- **DC-STEPFUN** — provider "stepfun", assumed_region "cn-north", pue 1.3, cloud "unknown". *Source:* Limited public disclosures for StepFun (CN AI provider); conservative PUE 1.3 applied per CN non-hyperscaler guidance. *Uncertainty:* very high. *Where used:* closed_models.yaml. *Last reviewed:* 2026-06-15.

### DC-OPENROUTER (Phase 3 expansion)
- **DC-OPENROUTER** — provider "openrouter", assumed_region "us-east", pue 1.2, cloud "unknown". *Source:* OpenRouter acts as inference router/gateway; underlying capacity typically US hyperscaler or partner; default PUE per A4. *Uncertainty:* high (multi-provider backend, customer-selected). *Where used:* closed_models.yaml. *Last reviewed:* 2026-06-15.

### DC-MOONSHOTAI (Phase 3 expansion)
- **DC-MOONSHOTAI** — provider "moonshotai", assumed_region "cn-north", pue 1.3, cloud "unknown". *Source:* Moonshot AI (CN); sparse public DC / region data; PUE 1.3 for CN provider. *Uncertainty:* high. *Where used:* closed_models.yaml. *Last reviewed:* 2026-06-15.

### DC-ZAI (Phase 3 expansion)
- **DC-ZAI** — provider "z-ai", assumed_region "cn-north", pue 1.3, cloud "unknown". *Source:* Zhipu AI (GLM family, CN); PUE 1.3 conservative for CN lab-scale / regional provider cooling. *Uncertainty:* high. *Where used:* closed_models.yaml. *Last reviewed:* 2026-06-15.

---

## V — Vendor Renewable Claims

- **V-GOOGLE** — 100% annual renewable match. *Source:* Google Environmental Report (since 2017). *Uncertainty:* low (for annual matching, but does not imply 24/7 CFE). *Where used:* vendor_claims.yaml.
- **V-OPENAI** — 100% annual renewable match. *Source:* Microsoft Azure Environmental Sustainability Report (matched since 2014). *Uncertainty:* low. *Where used:* vendor_claims.yaml.
- **V-ANTHROPIC** — 100% annual renewable match. *Source:* Assumed based on hosting via Google Cloud and AWS, both of which claim 100% renewable matching. *Uncertainty:* medium (assumes all inference infrastructure is covered by host claims). *Where used:* vendor_claims.yaml.
- **V-META** — 100% annual renewable match. *Source:* Meta Sustainability Report (matched since 2020). *Uncertainty:* low. *Where used:* vendor_claims.yaml.

### C-MARKET-RESIDUAL — Market-based residual floor *(Phase 7)*
- **C-MARKET-RESIDUAL** — `market_factor = max(market_residual_floor, 1 − match%/100)` with **market_residual_floor = 0.10**. A vendor's **100 % annual** renewable match would otherwise drive market-based (Scope 2) CO₂ to exactly **0** — a false-precision zero forbidden by the project's "no silent zeros" rule. Annual matching is **not** 24/7 carbon-free: hourly generation/consumption mismatch leaves real residual emissions (Google reported ~64 % global 24/7 CFE in 2023 **despite** 100 % annual matching). 0.10 is a **conservative lower bound** on residual (actual is likely higher); rows where the floor binds are flagged **MARKET_RESIDUAL_FLOOR**. *Uncertainty:* high (single global floor; per-provider hourly profiles vary). *Where used:* `methodology_factors.yaml` `market_residual_floor`; `estimate.py` market step; `data/provenance/sources.yaml#C-MARKET-RESIDUAL`. *Last reviewed:* 2026-06-16.

### C-AGG-CORRELATION — Aggregation of uncertainty *(Phase 7)*
- **C-AGG-CORRELATION** — Per-model `{low,mid,high}` ranges are summed to ecosystem totals two ways. **`totals.co2_kg`** (headline) sums endpoints linearly (low+low, high+high) — the conservative **perfect-correlation envelope**, justified because the dominant uncertainties (PUE band, energy-class intensity, grid factor) are *shared systematic* assumptions applied identically to every model, so their errors add coherently. **`totals.co2_kg_independent`** combines the half-widths in **quadrature** (√Σ of squares), the narrower band that would apply if per-model errors were statistically *independent* and partially cancelled. Reality lies between the two; the headline uses the conservative `co2_kg`. *Where used:* `output._sum_co2` / `output._sum_co2_independent`; `totals.co2_kg` + `totals.co2_kg_independent`. *Last reviewed:* 2026-06-16.

---

## L — Licensing / scope notes

- **L-EM-FREE** — Electricity Maps free tier is **non-commercial**. Decision for public deployment (academic/non-commercial use vs. academic access vs. annual-factor-heavy mode) is recorded in `methodology.md` and `README.md` before going live (Phase 5).
- **L-OR-CITATION** — OpenRouter requires the citation string in any republished figure (see ENGINEERING_STANDARDS §6).
- **L-TOKENIZER** — Token counts come from each provider's own tokenizer and are **not directly comparable** across rows; note this wherever cross-model token sums appear.

---

*Maintenance:* review the dated entries when refreshing data or before submitting the thesis. Stale grid factors and energy coefficients are the most likely to drift.

---

## A6 — Alternative assumption sets (Phase 6I only)

`data/assumptions/alt_assumption_sets.yaml` supplies the defensible variants passed exclusively to `pipeline.fairness.rank_stability` (via `build_output`). These quantify leaderboard robustness on the two boards (total CO₂; CO₂ per output token) when we vary:

- A2 input:output split (70:30 vs documented 80:20)
- A4 PUE (1.1 and 1.5 scalars vs the band)
- region grid factor ("best" = lowest seeded annual, europe-west 230 g, vs each model's assumed region)

Each numeric leaf carries a `source_id` that resolves in `sources.yaml` (A2, A4, C-GRID-EUROPE-WEST-230). The sets never affect primary published estimates or the core chain; they exist only for the `totals.fairness.rank_stability` companion (and the unweighted aggregate view). See `specs/phase-6i-fairness-and-boundary.md` (Tasks 3/4/6) and `DATA_SCHEMAS.md` §1.

Values + sources (reused; no new magic):
- "70:30" → A2
- PUE 1.1 / 1.5 → A4
- grid_gco2 230 → C-GRID-EUROPE-WEST-230

Last reviewed: 2026-06-16.
