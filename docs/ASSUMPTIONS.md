# docs/ASSUMPTIONS.md

Every number this project relies on lives here with a source, a value/range, and an uncertainty note. **When you introduce any new constant, coefficient, ratio, or region factor, add an entry in the same commit.** This file is the backbone of the methodology chapter / thesis.

Each entry: `ID · statement · value(range) · source · uncertainty · where used · last reviewed`.

---

## A — Modeling assumptions

### A1 — Model subset (MVP)
Start with OpenRouter top-list **open** models that have AI Energy Score data, plus 1–2 **closed** models via EcoLogits. Listed in `model_crosswalk.yaml`. Expanded in later phases. *Uncertainty:* coverage is partial; `totals.modeled_traffic_fraction` reports how much of the day's traffic is actually modeled.

### A2 — Input:output token ratio
`rankings-daily` returns **combined** prompt+completion tokens; inference energy scales mainly with **output** tokens. Default split **80:20 (input:output)** → `est_output_tokens = total_tokens × 0.20`.
- *Status:* first verify whether the API exposes a completion-only field; if so, use it and retire this assumption.
- *Source:* default informed by OpenRouter's published usage study (refine with their reported ratios). *Uncertainty:* high; treat as a sensitivity-analysis axis in the methodology. *Where used:* `pipeline/tokens.py`.

### A3 — Data-center region per model
One assumed region per provider (`closed_models.yaml`), used to fetch grid intensity. *Source:* public provider/cloud disclosures + reasonable inference. *Uncertainty:* high for closed providers (location undisclosed). Flag rows with `CLOSED_MODEL_ASSUMED`.

### A4 — Power Usage Effectiveness (PUE)
Default **1.2** (hyperscaler-class) unless a better per-provider figure exists.
- *Source:* Google data-center PUE reporting; Uptime Institute global survey. *Uncertainty:* real fleet PUE ranges ~1.1–1.6; widen the band for non-hyperscaler hosts.

---

## E — Energy intensity (Wh per output token)

These feed `data/energy/intensity.yaml`. Each model/class entry must cite how its Wh/output-token range was derived.

- **E-METHOD** — Two primary sources: (1) **AI Energy Score** (Hugging Face/Salesforce/CMU) — measured Wh per 1000 standardized queries; back out per-output-token by dividing by the assumed mean output tokens per benchmark query (record the assumed value). (2) **EcoLogits** — per-request impacts modeled from provider + model + output-token count + latency (LCA-based, ISO 14044). For closed models, parameter counts are estimates → carry a wide range. *Uncertainty:* note that a single chat-style query has been estimated anywhere from ~0.3 Wh (Google) to ~1.8–7 Wh (EcoLogits) depending on assumptions — your ranges should reflect that spread.
- **E-CLASS-\*** — Parameter-class fallback coefficients for unknown/uncovered models, keyed by active-parameter band. Source + derivation recorded per band. *Uncertainty:* very high; these exist so the pipeline degrades gracefully, not to be precise.
- **E-{MODEL}** — One entry per modeled model as it's added.

### E-CLASS-SMALL (Phase 2 seed)
- **E-CLASS-SMALL** — 0.0005–0.0012–0.0025 Wh per output token for models with active params ≲15B. *Source:* informed by AI Energy Score v2 small-model measurements + EcoLogits ranges for 7-13B class; widened ±~2x for benchmark-to-prod variance, tokenizer diffs, and measurement uncertainty. *Uncertainty:* high (class band, not per-model). *Where used:* intensity.yaml parameter_class_fallback first band; fallback path for unknown models or explicit "parameter_class_fallback" in crosswalk. *Last reviewed:* 2026-06-15.

### E-CLASS-LARGE (Phase 2 seed)
- **E-CLASS-LARGE** — 0.002–0.005–0.012 Wh per output token for models with active params up to ~100B. *Source:* informed by AI Energy Score v2 + EcoLogits 30-100B class measurements; upper widened for closed-model opacity (no public params). *Uncertainty:* very high. *Where used:* intensity.yaml large band; default conservative choice for UNKNOWN_MODEL. *Last reviewed:* 2026-06-15.

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

---

## L — Licensing / scope notes

- **L-EM-FREE** — Electricity Maps free tier is **non-commercial**. Decision for public deployment (academic/non-commercial use vs. academic access vs. annual-factor-heavy mode) is recorded in `methodology.md` and `README.md` before going live (Phase 5).
- **L-OR-CITATION** — OpenRouter requires the citation string in any republished figure (see ENGINEERING_STANDARDS §6).
- **L-TOKENIZER** — Token counts come from each provider's own tokenizer and are **not directly comparable** across rows; note this wherever cross-model token sums appear.

---

*Maintenance:* review the dated entries when refreshing data or before submitting the thesis. Stale grid factors and energy coefficients are the most likely to drift.
