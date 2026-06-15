# specs/phase-4-frontend.md — Minimal static frontend

## Objective
A minimal, honest static dashboard (Vite + React + TypeScript) that renders `latest.json`. No runtime backend; reads only the committed JSON.

## Prerequisites
Phase 3 done (`data/output/latest.json` exists and validates).

## Tasks
1. Scaffold `web/` (Vite `react-ts`). Add Recharts. If a `frontend-design` skill is available, read it first and use its tokens.
2. **Data wiring:** a `prebuild` script copies `data/output/latest.json` → `web/public/data/latest.json`. The app fetches that static file; no other network calls.
3. Components:
   - `ScopeDisclaimerBanner` — always visible; renders `scope_note` + `source_citation`. Cannot be dismissed.
   - `ModelsTable` — sortable by `co2_kg.mid` and by **CO₂ per 1k output tokens** (efficiency). Columns show the **range** (mid with low–high), origin, open/closed, `energy_source`, `grid_source`, flags.
   - `Co2BarChart` — Recharts bar of `co2_kg.mid` per model with **error bars** from `low`/`high`.
   - `GroupToggle` — group/colour by `open_or_closed` and by `origin`.
4. **Honesty in the UI:** never show a bare point number for energy/CO₂ — always mid + range. Surface `modeled_traffic_fraction` ("we model X% of the day's tokens"). Show flags (e.g., assumed/fallback) as badges. Format big numbers (T tokens; t or kg CO₂).
5. Responsive + accessible table; works on mobile width.

## Test requirements
- `tsc` type-check passes; `npm run build` produces a static bundle.
- One light component test (vitest + Testing Library): the disclaimer renders, and the table re-sorts on header click.

## Acceptance criteria
- [ ] `npm run dev` shows the chart + table from real pipeline output.
- [ ] Disclaimer banner + OpenRouter attribution always visible.
- [ ] Every energy/CO₂ value shown as a range, never a bare point.
- [ ] `modeled_traffic_fraction` and flags surfaced; `npm run build` is static.

## Standards
ENGINEERING_STANDARDS §2 (ranges in UI), §6 (attribution). No runtime network calls. No secrets in the frontend.

## Out of scope
Scenario sliders, market-vs-location view, history/trends (all Phase 6+). Any backend.

## Definition of Done
ENGINEERING_STANDARDS §8 (the testing bullets adapted to web) + acceptance above. Update `specs/INDEX.md`.
