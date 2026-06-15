import React from 'react';

interface Props {
  scopeNote: string;
  sourceCitation: string;
}

/**
 * ScopeDisclaimerBanner — always visible, non-dismissable.
 * Renders scope_note + source_citation from latest.json (ENGINEERING_STANDARDS §6 attribution).
 * Per phase-4 spec: must be prominent and permanent.
 */
export const ScopeDisclaimerBanner: React.FC<Props> = ({ scopeNote, sourceCitation }) => {
  return (
    <div
      role="note"
      aria-label="Scope and data source disclaimer"
      style={{
        background: '#fffbeb',
        border: '1px solid #f59e0b',
        borderRadius: 6,
        padding: '12px 16px',
        margin: '12px 0',
        fontSize: '0.95em',
        lineHeight: 1.4,
        color: '#78350f',
      }}
    >
      <strong>Scope &amp; honesty:</strong> {scopeNote}
      <div style={{ marginTop: 6, fontSize: '0.9em', opacity: 0.9 }}>
        {sourceCitation}
      </div>
      <div style={{ marginTop: 4, fontSize: '0.85em', fontStyle: 'italic' }}>
        This project estimates the CO₂ footprint of <strong>OpenRouter-visible LLM inference</strong> — a representative but partial slice of global AI usage. It is <strong>NOT</strong> a measurement of total global data-center emissions. All figures are estimates with uncertainty ranges, not measurements.
      </div>
    </div>
  );
};
