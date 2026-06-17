import React from 'react';
import type { Lang } from '../lib/i18n';
import { useI18n } from '../lib/i18n';
import { formatTokens } from '../lib/format';

interface Props {
  scopeNote: string;
  sourceCitation: string;
  unmappedTrafficFraction?: number;
  unmappedSlugs?: { slug: string; total_tokens: number }[];
  lang?: Lang;
}

/**
 * ScopeDisclaimerBanner — always visible, non-dismissable.
 * Renders scope_note + source_citation from latest.json (ENGINEERING_STANDARDS §6 attribution).
 * Per phase-4 spec: must be prominent and permanent.
 * Extended for 6E: appends coverage/unmapped note (when >0) using emerald styling for factual non-alarming presentation.
 */
export const ScopeDisclaimerBanner: React.FC<Props> = ({ scopeNote, sourceCitation, unmappedTrafficFraction, unmappedSlugs, lang = 'en' }) => {
  const tt = useI18n(lang);
  const showUnmapped = typeof unmappedTrafficFraction === 'number' && unmappedTrafficFraction > 0;

  return (
    <div
      role="note"
      aria-label="Scope and transparency note"
      className="card p-4 text-sm border-[var(--warning-border)] bg-[var(--bg-elev)]"
    >
      <div className="uppercase tracking-[1px] text-[var(--warning)] text-xs font-bold flex items-center gap-2 mb-1.5 label-sm">
        <span>⚠</span> {tt.scopeWarnLabel}
      </div>
      <p className="text-[var(--text-secondary)] leading-snug">{scopeNote}</p>
      <p className="text-[11px] text-[var(--text-muted)] mt-1">{sourceCitation}</p>
      <div className="mt-2 text-[12px] text-[var(--accent)]/90 border-l-2 border-[var(--accent-border)] pl-2.5">
        {tt.scopeWarnBody}
      </div>
      {showUnmapped && (
        <div className="mt-3 text-[12px] text-[var(--accent)]/90 border-l-2 border-[var(--accent-border)] pl-2.5">
          {tt.unmappedCoverageNote(
            (unmappedTrafficFraction * 100).toFixed(1),
            (unmappedSlugs || []).length
          )}
          {unmappedSlugs && unmappedSlugs.length > 0 && (
            <span className="block mt-0.5 text-[var(--text-muted)] text-[11px]">
              {tt.unmappedTopModels} {unmappedSlugs.slice(0, 5).map((s, i) => (
                <span key={i}>{i > 0 ? ', ' : ''}{s.slug} <span className="opacity-70">({formatTokens(s.total_tokens)})</span></span>
              ))}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
