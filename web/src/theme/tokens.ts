/**
 * Retro-futurist / phosphor-terminal design tokens for LLM Carbon Index (Phase 6L).
 * Palette: amber-phosphor (#ffbf00) on near-black console (#0a0805).
 * All components MUST import from here (or use CSS vars defined in tokens.css) — NO hardcoded hex in components.
 * See specs/phase-6l-retro-tech-frontend.md
 *
 * Type: monospace for data/labels (tabular), humanist sans for prose.
 * Labels: small ALL-CAPS + letter-spacing.
 * Grid unit: 4px base.
 * Motion: restrained; see prefers-reduced-motion handling in CSS.
 */
export const tokens = {
  colors: {
    // Core surfaces (near-black console)
    bg: '#0a0805',
    bgElev: '#11100c',
    bgCard: '#14120f',
    bgCardHover: '#181612',
    border: '#28241e',
    borderStrong: '#3f362b',

    // Text (warm off-white for phosphor terminal feel; high contrast on dark)
    text: '#e8dfc9',
    textSecondary: '#b0a38a',
    textMuted: '#827a68',

    // Phosphor amber accent (primary action / highlight / error bars)
    // WCAG AA: amber #ffbf00 on #0a0805 yields >>4.5:1 (large) and normal text contrast sufficient when paired with weight.
    accent: '#ffbf00',
    accentDark: '#c48f00',
    accentLight: '#ffcf40',
    accentBg: 'rgba(255, 191, 0, 0.12)',
    accentBorder: 'rgba(255, 191, 0, 0.35)',

    // Warning / caution (for staleness, fallbacks)
    warning: '#e67e22',
    warningBg: 'rgba(230, 126, 34, 0.12)',
    warningBorder: 'rgba(230, 126, 34, 0.35)',

    // Group / origin distinctions (phosphor-retro tinted, distinguishable)
    open: '#c9b36b',       // gold-amber for open
    closed: '#c46b6b',     // muted rose-amber
    cn: '#e89f4a',         // warm amber-orange
    us: '#5c9ab5',         // steel blue (cool phosphor adj)
    eu: '#8f7ab5',         // muted violet
    other: '#6b6760',      // warm slate

    // Banner specific (keep distinct semantics, amber family)
    scopeAmber: '#f4a261',
    precisionSky: '#8ab4c8',  // cool variant for precision (kept for visual grouping)
    fairness: '#c9b36b',
  },

  // Typography scale + style
  font: {
    sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    // Small-caps label style applied via .label or CSS
  },

  // Spacing grid (4px unit)
  space: {
    unit: 4,
    '1': '4px',
    '2': '8px',
    '3': '12px',
    '4': '16px',
    '5': '20px',
    '6': '24px',
  },

  // Motion tokens (respect reduced-motion in CSS)
  motion: {
    fast: '120ms cubic-bezier(0.2, 0, 0, 1)',
    base: '180ms cubic-bezier(0.2, 0, 0, 1)',
  },
} as const;

export type Tokens = typeof tokens;
