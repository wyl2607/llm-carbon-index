/**
 * Light, professional data-dashboard design tokens for LLM Carbon Index.
 * Clean white surfaces, neutral grays, a single readable emerald accent.
 * Keep in sync with theme/tokens.css (CSS custom properties).
 * All components MUST import from here (or use CSS vars defined in tokens.css) — NO hardcoded hex in components.
 *
 * Type: monospace for data/labels (tabular), humanist sans for prose.
 * Labels: small ALL-CAPS + letter-spacing.
 * Grid unit: 4px base.
 * Motion: restrained; see prefers-reduced-motion handling in CSS.
 */
export const tokens = {
  colors: {
    // Core surfaces (clean white)
    bg: '#ffffff',
    bgElev: '#f6f7f9',
    bgCard: '#ffffff',
    bgCardHover: '#f3f5f7',
    border: '#e4e7ec',
    borderStrong: '#cdd2da',

    // Text (near-black on white; AA verified)
    text: '#15181d',
    textSecondary: '#4a5160',
    textMuted: '#6b7280',

    // Emerald accent — readable as fill (white text) AND as text on white (~5.5:1)
    accent: '#047857',
    accentDark: '#065f46',
    accentLight: '#059669',
    accentBg: 'rgba(4, 120, 87, 0.08)',
    accentBorder: 'rgba(4, 120, 87, 0.30)',

    // Warning / caution (for staleness, fallbacks)
    warning: '#b45309',
    warningBg: 'rgba(180, 83, 9, 0.09)',
    warningBorder: 'rgba(180, 83, 9, 0.30)',

    // Group / origin distinctions — clean categorical palette, distinct on white
    open: '#059669',       // emerald for open
    closed: '#64748b',     // slate for closed
    cn: '#e8743b',         // warm orange
    us: '#3b82f6',         // blue
    eu: '#8b5cf6',         // violet
    other: '#94a3b8',      // slate-gray

    // Banner specific
    scopeAmber: '#d97706',
    precisionSky: '#2563eb',
    fairness: '#059669',
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
