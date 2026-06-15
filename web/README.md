# web/ — static frontend (Phase 4)

A **Vite + React + TypeScript + Tailwind** app that reads committed JSON from
`../output/*.json`. No live backend; deploys static to Vercel or GitHub Pages.
Not scaffolded yet (created in Phase 4).

## Required views (from PLAN.md)

- Leaderboard by **total CO₂**
- Leaderboard by **efficiency (CO₂ per token)**
- Filters: open vs closed, origin country, provider
- Grid / renewable panel
- **Scenario sliders**: green-X%, best-region, market vs location
- A prominent **Methodology & Uncertainty** page

## Must be visible in the UI (non-negotiable)

- The **scope statement** (partial slice, not total AI emissions).
- **Uncertainty ranges** on every figure — never a bare single number.
- The OpenRouter attribution string + grid data source.

## Design language (absorbed from the Gemini effort — see docs/absorbed-from-gemini.md)

**"Light Minimalist / Scholarly"**, generous whitespace:

- Top header: title + data-source line + **location-vs-market** toggle tabs.
- KPI cards row: today's total CO₂, blended green-substitution %, average grid
  intensity, most-efficient model.
- 2-column charts: left = region token-share vs CO₂-share bars; right = grid
  intensity list with a renewable-% badge per region.
- Leaderboard table: rank, model, region (country flag), daily usage, location
  CO₂, market CO₂, green-substitution % — with ranges shown.

Mobile-friendly is a Phase-4 acceptance criterion.
