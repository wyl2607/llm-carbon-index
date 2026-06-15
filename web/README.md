# web/ — LLM Carbon Index (Phase 4 minimal static frontend)

Vite + React + TypeScript + Recharts + vitest + @testing-library/react.

**This directory contains ONLY the static frontend.** All pipeline work lives outside `web/`.

## Data wiring (strictly followed)
- `prebuild` (and `npm run copy-data`) copies:
  - `../data/output/latest.json` (preferred, when Phase 3 has run) → `public/data/latest.json`
  - Otherwise `../tests/fixtures/latest.sample.json` (the schema-valid sample) as **placeholder**.
- The React app **only** does `fetch('/data/latest.json')`. No other network calls. No secrets. No live backend.
- **Sample data label**: when using the fixture the UI shows a clear warning banner. The web/ code and this README label it as sample until real pipeline output lands.

## Run (from inside web/)
```bash
npm install
npm run dev          # copies data then starts Vite
npm run build
npx tsc --noEmit
npm run test -- --run
```

## Components & UX (post-premium dashboard overhaul)
- Full dark-first ESG-grade dashboard (emerald accent). Sticky header, URL-shareable scenarios (?shift=35&acc=market&lang=zh).
- `WhatIfSimulator`: major interactive storytelling panel with live slider (1% steps), 3 presets, before/after avoided kg, real-world equivalents (cars/flights/trees/homes) with cited methodology notes.
- `KpiCards`: scenario-aware with avoided delta when shift active.
- `ModelsTable`: search + origin/type filters, CSV export of *scenario values*, inspect modal with full assumptions/flags/PUE/grid, bilingual column headers via i18n.
- `Co2BarChart` + `OriginDonut`: Recharts with error whiskers, origin breakdown donut.
- `HistoryViewer`: area trends + Jevons Paradox callout (bilingual support).
- `ScopeDisclaimerBanner`: toned professional transparency note (always present).
- Full bilingual (EN / 中文) with instant toggle. All major labels, notes, and UI strings in lib/i18n.ts.
- Keyboard accessible, high contrast, mobile responsive, skeletons on load, shareable deep links.

## Honesty rules (ENGINEERING_STANDARDS §2, §6 + phase spec)
- No bare point numbers for energy/CO₂ anywhere — always mid + range via `formatCO2Range`.
- `modeled_traffic_fraction` is prominently surfaced ("We model X% of the day's tokens").
- Big numbers formatted (T tokens, t/kg CO₂).
- Attribution string carried from JSON and displayed.
- The global scope statement appears in the banner and UI.

## One required vitest test
`src/components/ModelsTable.test.tsx` (mounted via App bits): verifies the disclaimer banner renders the scope text, and that clicking table headers re-sorts the rows.

## Definition of Done (executed from web/)
All of:
```
npm install
npm run build
npx tsc --noEmit
npm run test -- --run
```
green + this README updated.

## Notes
- The old PLAN.md / web/README expectations (Tailwind, sliders, history, full KPI cards) are Phase 6+ and out of scope for Phase 4.
- Update `specs/INDEX.md` and commit are coordinator tasks outside this `web/` worktree scope (per explicit instructions: do not edit anything outside `web/`).


Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
