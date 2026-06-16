# Fairness & Comparability

This document outlines the principles used to ensure the LLM Carbon Index remains impartial and academically rigorous when comparing disparate model classes, providers, and origins.

## 1. Open vs. Closed Model Asymmetry

There is a fundamental information gap between open-weights models and proprietary "closed" models.

- **Open Models**: Energy intensity is derived from direct measurements (e.g., AI Energy Score [E-METHOD]) or known parameter counts and architectures.
- **Closed Models**: Energy intensity is modeled using EcoLogits-class assumptions [E-METHOD, A3], which involve wider uncertainty bands to account for undisclosed parameter counts, hardware, and facility efficiency.

**Fairness Rules:**
- **Ranges, Not Midpoints**: All cross-model comparisons MUST use the full `{low, mid, high}` range. Ranking or sorting by a single midpoint is prohibited as it creates false precision.
- **Intentional Width**: Closed model ranges are intentionally wider to reflect their opacity.
- **Midpoint Ranking Restriction**: A closed model shall never be ranked "better" than an open model based on a midpoint comparison alone if their ranges overlap significantly.

## 2. Tokenizer Non-Comparability (L-TOKENIZER)

Token counts are provided by each model's proprietary tokenizer. Because different tokenizers segment the same text into different numbers of tokens, a simple sum of "total tokens" is not an apples-to-apples comparison of workload.

- **Fairer Axis**: To mitigate this, the index promotes **CO2 per output token** as the primary efficiency metric, as output tokens are the most energy-intensive phase of inference.
- **Caveat Labeling**: Wherever cross-model token sums or per-token efficiency metrics appear, the `L-TOKENIZER` caveat must be visible to inform the reader that these figures are relative to each model's specific tokenizer.

## 3. Origin Neutrality

The project maintains strict origin neutrality. The estimation methodology is identical for all models regardless of their `origin` (e.g., CN, US, EU).

- **Consistent Method**: The same physics-based estimation chain (Tokens → Energy → PUE → Carbon) is applied to all rows.
- **Regional Factors**: The only origin-linked difference in the calculation is the **sourced grid factor** of the assumed serving region [A3]. A model with a `cn-north` origin will use the grid factor for that region [C-GRID-CN-NORTH-537], just as a `us-east` model uses its respective factor [C-GRID-US-EAST-380]. No arbitrary "penalty" or "bonus" is applied based on geopolitical origin.

## 4. Traffic Weighting

OpenRouter traffic is heavily skewed; a small number of popular models often dominate the total footprint.

- **Token-Weighted Totals**: Daily totals are token-weighted by `total_tokens` to reflect the actual environmental impact of the day's usage.
- **Unweighted Companion**: To ensure the picture isn't merely an artifact of one or two high-traffic models, the index reports an **unweighted companion** for totals. This allows researchers to see the average footprint of the modeled model library independent of current market popularity.

## Summary of Principles

By adhering to these rules—prioritizing ranges over points, acknowledging tokenizer differences, maintaining methodological consistency across origins, and providing unweighted comparisons—the LLM Carbon Index ensures that its rankings are a fair representation of the best available evidence.
