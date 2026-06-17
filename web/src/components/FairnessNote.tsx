import React from 'react';
import type { Fairness } from '../types';
import type { Lang } from '../lib/i18n';
import { useI18n } from '../lib/i18n';

interface Props {
  fairness?: Fairness;
  lang?: Lang;
}

/**
 * FairnessNote — Phase 6I comparability & fairness.
 * Always visible, non-dismissable. Reports rank-stability under alternative
 * assumptions and links to BOUNDARY.md + FAIRNESS.md. Promotes efficiency
 * (CO₂/output-token) as the fairer cross-model axis and surfaces the
 * tokenizer non-comparability caveat (L-TOKENIZER).
 */
export const FairnessNote: React.FC<Props> = ({ fairness, lang = 'en' }) => {
  // Hooks must run unconditionally before any early return (react-hooks/rules-of-hooks).
  const tt = useI18n(lang);
  if (!fairness) return null;

  const { rank_stability } = fairness;
  const co2Changed = rank_stability.by_co2.ranks_changed;
  const effChanged = rank_stability.by_efficiency.ranks_changed;
  const topN = rank_stability.by_co2.top_n;
  const maxDisp = Math.max(
    rank_stability.by_co2.max_displacement,
    rank_stability.by_efficiency.max_displacement,
  );

  const isRobust = co2Changed === 0 && effChanged === 0;
  const stabilityLabel = tt.rankStabilityLabel(topN, maxDisp, isRobust);
  const indicatorColor = isRobust ? 'text-[var(--accent)]' : 'text-[var(--warning)]';
  const indicatorBorder = isRobust ? 'border-[var(--accent-border)] bg-[var(--bg-elev)]' : 'border-[var(--warning-border)] bg-[var(--bg-elev)]';

  const methodologyBase = 'https://github.com/wyl2607/llm-carbon-index/blob/main/docs';

  return (
    <div
      role="note"
      aria-label="Comparability and fairness note"
      className={`card p-4 text-sm ${indicatorBorder} border-l-4 ${isRobust ? 'border-l-[var(--accent)]' : 'border-l-[var(--warning)]'}`}
    >
      <div className={`uppercase tracking-[1px] ${indicatorColor} text-xs font-bold flex items-center gap-2 mb-1.5 label-sm`}>
        <span>⚖</span>
        {tt.fairnessHeader}
      </div>
      <p className="text-[var(--text-secondary)] leading-snug font-medium">
        {tt.rankStability(stabilityLabel)}
      </p>
      {/* Phase 6m: louder, explicit numbers + tier honesty callout */}
      <p className={`mt-2 text-xs font-semibold ${isRobust ? 'text-[var(--accent)]' : 'text-[var(--warning)]'}`}>
        by_co2: ranks_changed={co2Changed} / top_n={topN}, max_displacement={rank_stability.by_co2.max_displacement}.
        {' '}{tt.tierNote}
      </p>
      <p className="text-[12px] text-[var(--text-muted)] mt-1.5 border-l-2 border-[var(--border)] pl-2.5">
        {tt.lTokenizerNote}
        {' '}
        <a
          href={`${methodologyBase}/BOUNDARY.md`}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 opacity-60 hover:opacity-100"
        >
          {tt.boundaryLink}
        </a>
        {' · '}
        <a
          href={`${methodologyBase}/FAIRNESS.md`}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 opacity-60 hover:opacity-100"
        >
          {tt.fairnessLink}
        </a>
      </p>
    </div>
  );
};
