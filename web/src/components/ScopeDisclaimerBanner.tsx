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
      aria-label="Scope and transparency note"
      className="card p-4 text-sm border-amber-900/40 bg-[#11140f]"
    >
      <div className="uppercase tracking-[1px] text-amber-400 text-xs font-bold flex items-center gap-2 mb-1.5">
        <span>⚠</span> SCOPE &amp; TRANSPARENCY — NON-NEGOTIABLE
      </div>
      <p className="text-[#c7c9c3] leading-snug">{scopeNote}</p>
      <p className="text-[11px] text-[#8a8f87] mt-1">{sourceCitation}</p>
      <div className="mt-2 text-[12px] text-amber-300/90 border-l-2 border-amber-800/60 pl-2.5">
        This project estimates the CO₂ footprint of <strong>OpenRouter-visible LLM inference</strong> — a representative but partial slice. It is <strong>NOT</strong> global data-center emissions. All figures are estimates with full low/mid/high ranges.
      </div>
    </div>
  );
};
