# specs/phase-6l-retro-tech-frontend.md — Retro-tech (retrofuturist) frontend

## Objective
Re-skin the existing static dashboard in a coherent **science-retro / retrofuturist** language — instrument-panel + phosphor-terminal meets technical-manual — without losing a single honesty surface. Design wraps a finished, sourced, verifiable dataset; it must make transparency *more* legible, never serve as decorative cover for it. Comes last by design.

## Prerequisites
6F–6K done (precision badges, provenance, fairness/rank-stability, and sensitivity all exist in the JSON). If a `frontend-design` skill is available, **read it first** and use its tokens.

## Design direction (the one knob you tune)
A single coherent retrofuturist system. Defaults below; the **tunable choice is the era/palette** — pick one and apply it consistently across the app:
- **Type:** a monospace/technical face for all data and labels (tabular figures); a humanist face for prose. Small ALL-CAPS labels with letter-spacing.
- **Surface:** deep-console or warm-paper background; hairline grid rules; boxed, tabular panels (instrument-readout feel); optional very-low-opacity scanline/bezel texture.
- **Accent:** one phosphor accent used sparingly for emphasis and error bars. Palette options — **amber-phosphor**, **green-phosphor (P1)**, **cool-CRT-blue**, or **paper-blueprint**. Default: amber-phosphor on near-black.
- **Motion:** restrained; honor `prefers-reduced-motion` (no flicker / CRT-jitter when reduced).

## Tasks
1. `web/src/theme/` — design tokens (color, type scale, mono/label fonts, grid unit, motion) for the chosen palette. **No hardcoded colors in components.**
2. Restyle existing components, preserving their data contracts: `ModelsTable`, `Co2BarChart` (Recharts, restyled — **error bars stay**), `GroupToggle`, scenario sliders (6A), market-vs-location (6B), trends (6C), water (6D).
3. **Honesty surfaces — all remain prominent, never buried:**
   - `ScopeDisclaimerBanner` (non-dismissible) + OpenRouter attribution.
   - `PrecisionBanner` (6F) — measured% / live-grid%.
   - per-row tier/flag badges, each **linking to its source** (6G `sources`).
   - the fairness / rank-stability note + tokenizer caveat (6I); efficiency as the default cross-model sort.
   - ranges everywhere — never a bare point number (ENGINEERING_STANDARDS §2).
4. **Accessibility (non-negotiable):** WCAG AA contrast for the chosen palette (verify amber/green on dark passes), full keyboard nav, visible focus states, `prefers-reduced-motion`, semantic table markup.
5. **Responsive:** legible on mobile — instrument panels reflow to stacked cards.
6. Refresh the OG/preview image to match the new look.

## Test requirements
- `tsc` passes; `npm run build` is static; no runtime network calls beyond the local JSON.
- Component tests: scope banner + precision banner render and are not dismissible; a flag badge exposes its source link; the table still re-sorts.
- **Contrast check** (axe or a manual matrix) for the chosen palette, recorded in the PR.
- `prefers-reduced-motion` disables the CRT/scanline animation.

## Acceptance criteria
- [ ] New retrofuturist theme applied via tokens; no hardcoded colors in components.
- [ ] Every honesty surface (scope, precision%, range error bars, flag→source links, fairness note) is present and prominent.
- [ ] WCAG AA contrast met; keyboard + reduced-motion supported; mobile reflow works.
- [ ] `npm run build` static; component tests + `tsc` green.

## Standards
ENGINEERING_STANDARDS §2 (ranges in UI), §6 (attribution). No secrets in the frontend. Use the `frontend-design` skill tokens if present. Design serves transparency.

## Out of scope
New data/metrics. Any backend. Changing methodology.

## Definition of Done
ENGINEERING_STANDARDS §8 (web-adapted) + acceptance above. Update `specs/INDEX.md`.
