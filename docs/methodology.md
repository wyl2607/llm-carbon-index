# Methodology & Uncertainty

> This document doubles as the project's thesis methodology section. It is a
> living draft, filled in phase by phase. Phase 0 establishes scope, the core
> formula, and the constants used to *prove the math*; later phases add the real
> energy engine (EcoLogits + AI Energy Score), live grid data (Electricity
> Maps), and the full constant tables.

## 1. Scope (non-negotiable)

This project estimates the CO₂ footprint of **OpenRouter-visible LLM
inference** — a *representative but partial* slice of global AI usage. Consumer
apps (ChatGPT, Gemini, Claude) are **not** in it. It is **NOT** a measurement of
total global data-center emissions. **All figures are estimates with explicit
uncertainty ranges, not measurements**, especially for closed models whose
parameters, hardware, and data-center locations are undisclosed.

## 2. The CO₂ chain

```
tokens (OpenRouter)  ──▶  energy (Wh)  ──▶  facility energy (× PUE)  ──▶  CO₂ (× grid gCO₂/kWh)
```

### 2.1 Core formula (location-based and market-based)

For one model on one day, carbon is computed per Scope-2 accounting in two
flavours (absorbed from the parallel Gemini design, see §6):

```
energy_Wh        = (I_prompt · T_prompt + I_comp · T_comp) · PUE
CO₂_location_g   = (energy_Wh / 1000) · C_location      # /1000 = Wh→kWh guard
CO₂_market_g     = (energy_Wh / 1000) · C_market
green_substitution_% = (CO₂_location − CO₂_market) / CO₂_location · 100
```

- `T_prompt, T_comp` — input/output token counts for the day (OpenRouter rankings).
- `I_prompt, I_comp` — energy intensity (Wh per token) for input/output. Output
  (decode) tokens dominate energy; input (prefill) is cheaper per token.
- `PUE` — data-center Power Usage Effectiveness multiplier.
- `C_location` — physical grid carbon intensity (gCO₂eq/kWh) of the likely region.
- `C_market` — grid intensity after PPA/REC green-energy procurement (Scope-2
  market-based). **Market-based numbers are provider-specific, often
  undisclosed, and treated as low-confidence assumptions — never invented as
  fact.**

**Uncertainty:** every intensity is carried as a `{min, max}` range, propagated
through to a `{min, max}` CO₂ — never collapsed to a single number.

### 2.2 Phase-0 prover constants (in `scratch/prove_math.py`)

The Phase-0 prover uses a simplified single output-token intensity purely to
show the chain is plausible. Sources:

| Constant | Value | Source |
|---|---|---|
| Energy / output token (min) | 2.0e-4 Wh/token | Luccioni, Jernite & Strubell (2024), *Power Hungry Processing*, FAccT'24 — text-gen median ≈ 0.047 kWh/1000 inferences ≈ ~1.8e-4 Wh/token at ~256-token median |
| Energy / output token (max) | 7.0e-4 Wh/token | de Vries (2023), *The growing energy footprint of AI*, Joule 7(10) — ~0.3 Wh per ChatGPT query ≈ ~6e-4 Wh/token at ~500 tokens, rounded up to bound uncertainty |
| PUE | 1.2 | Conservative hyperscale figure; Google fleet-wide ~1.10 (Google 2024 Environmental Report); all-DC industry avg ~1.5 (Uptime Institute 2023) |
| US grid intensity | 375 gCO₂eq/kWh | U.S. EPA eGRID2022 national average output emission rate |

Sanity target: per-prompt energy ≈ 0.3 Wh to a few Wh (prover yields ~0.12–0.42 Wh
for a 500-token response — plausible order of magnitude).

## 3. Energy engine (Phase 2 — hybrid)

- **EcoLogits** (LCA-based, ISO 14044; returns `{min,max}` ranges) as the baseline
  for API LLM calls from token counts + model assumptions.
- **AI Energy Score** (Hugging Face) measured Wh/1000-queries as a cross-check
  for open / partially-open models.
- **Fallback** param-class heuristic for unknowns, flagged `source: fallback`
  with a `confidence` field (never a silent 0).

All model-specific assumptions (params, active params, hardware, open/closed,
origin country) live in `data/*.yaml` — never hardcoded in `.py` (constraint #6).

## 4. Grid data (Phase 3)

- **Electricity Maps** live carbon intensity (gCO₂eq/kWh) + renewable %, by
  region, with response caching.
- **Fallback:** annual-average grid factors in `data/grid_fallback_factors.yaml`
  (Ember / IEA / national operators). Each output row records which source was used.

### 4.1 Annual fallback factors (seed — `data/grid_fallback_factors.yaml`)

| Region | gCO₂eq/kWh (location) | Source |
|---|---|---|
| US | 369 | Ember, US 2023 annual (cf. EPA eGRID2022 ~375) |
| CN | 537 | Ember, China 2023 annual |
| EU-27 | 242 | Ember, EU-27 2023 annual |
| FR | 56 | Ember, France 2023 (illustrative low-carbon region) |

> Correction vs the absorbed Gemini draft: Gemini used `EU = 82 gCO₂/kWh`
> uncited; that is close to a *France-specific* figure, not the EU-27 average
> (~242). We use Ember EU-27 and keep France as a separate, explicitly-low
> region. Market-based deductions (PPA) are deferred to Phase 3 as low-confidence
> per-provider assumptions with sources, not seeded as fact here.

## 5. Scenarios (Phase 3)

1. **Location-based** — actual current grid.
2. **Green-X%** — hypothetical X% renewable grid.
3. **Best-region** — shift to the lowest-carbon supported region.
4. **Market-based 100% matched** — contrast with location-based (the Scope-2
   distinction). This is *accounting*, not physics; documented as such.

## 6. Provenance & limitations

- Design ideas absorbed from a parallel Gemini effort are documented in
  [`absorbed-from-gemini.md`](absorbed-from-gemini.md), including which parts
  were rejected for violating the hard constraints.
- **Tokenizer caveat:** token counts from different providers use different
  tokenizers and are not directly comparable; cross-model aggregates note this.
- **Closed models:** parameters, hardware, and DC locations are undisclosed — their
  estimates carry the widest ranges and lowest confidence.
- **Coverage:** OpenRouter-visible traffic only; not total AI emissions.

## 7. Required attributions

- `Source: OpenRouter (openrouter.ai/rankings), as of {date}`
- Electricity Maps (live) + Ember/IEA (annual fallbacks), per-row source recorded.
