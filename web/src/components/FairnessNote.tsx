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
  if (!fairness) return null;

  const tt = useI18n(lang);
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
  const indicatorColor = isRobust ? 'text-emerald-400' : 'text-amber-400';
  const indicatorBorder = isRobust ? 'border-emerald-900/40 bg-[#0a140b]' : 'border-amber-900/40 bg-[#140f0a]';

  const methodologyBase = 'https://github.com/wyl2607/llm-carbon-index/blob/main/docs';

  return (
    <div
      role="note"
      aria-label="Comparability and fairness note"
      className={`card p-4 text-sm ${indicatorBorder}`}
    >
      <div className={`uppercase tracking-[1px] ${indicatorColor} text-xs font-bold flex items-center gap-2 mb-1.5`}>
        <span>⚖</span>
        {tt.fairnessHeader}
      </div>
      <p className="text-[#c7c9c3] leading-snug font-medium">
        {tt.rankStability(stabilityLabel)}
      </p>
      <p className="text-[12px] text-[#9ba19b] mt-1.5 border-l-2 border-[#2a2f2a] pl-2.5">
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
