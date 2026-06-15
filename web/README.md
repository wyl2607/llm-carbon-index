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

## Components implemented (per specs/phase-4-frontend.md + query)
- `ScopeDisclaimerBanner`: always visible, non-dismissable. Renders `scope_note` + `source_citation` + required scope statement.
- `ModelsTable`: sortable by `co2_kg.mid` and by CO₂-per-1k-output-tokens (efficiency). Every CO₂ value shows **mid (low–high)** range. Columns include origin, open/closed, energy_source, grid_source, flags as badges. Responsive (overflow scroll on mobile).
- `Co2BarChart`: Recharts bars of `co2_kg.mid` + `ErrorBar` whiskers from the low/high Range.
- `GroupToggle`: switches chart colouring between `open_or_closed` and `origin`.

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
