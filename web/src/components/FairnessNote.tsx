import React from 'react';
import type { Fairness } from '../types';
import type { Lang } from '../lib/i18n';

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

  const { rank_stability } = fairness;
  const co2Changed = rank_stability.by_co2.ranks_changed;
  const effChanged = rank_stability.by_efficiency.ranks_changed;
  const topN = rank_stability.by_co2.top_n;
  const maxDisp = Math.max(
    rank_stability.by_co2.max_displacement,
    rank_stability.by_efficiency.max_displacement,
  );

  const isRobust = co2Changed === 0 && effChanged === 0;
  const stabilityLabel = isRobust
    ? `top-${topN} order is robust under alternative assumptions`
    : `top-${topN} order shifts ≤${maxDisp} rank${maxDisp !== 1 ? 's' : ''} under alternative assumptions`;

  const zhStabilityLabel = isRobust
    ? `在替代假设下，前 ${topN} 排名稳定`
    : `在替代假设下，前 ${topN} 排名最多变动 ${maxDisp} 位`;

  const label = lang === 'zh' ? zhStabilityLabel : stabilityLabel;
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
        {lang === 'zh' ? '公正性 & 系统边界' : 'Comparability & Fairness'}
      </div>
      <p className="text-[#c7c9c3] leading-snug font-medium">
        {lang === 'zh'
          ? `排名稳定性：${label}。效率轴（CO₂/输出 token）比总量 CO₂ 更能跨模型比较。`
          : `Rank stability: ${label}. Efficiency (CO₂/output-token) is the fairer cross-model axis than total CO₂.`}
      </p>
      <p className="text-[12px] text-[#717771] mt-1.5 border-l-2 border-[#2a2f2a] pl-2.5">
        {lang === 'zh'
          ? '⚠ L-TOKENIZER：不同模型的 token 计数不可直接比较（分词器不同）。闭源模型区间故意更宽以反映其不透明性，从不仅凭中值排名。'
          : '⚠ L-TOKENIZER: token counts are not apples-to-apples across models (different tokenizers). Closed-model ranges are intentionally wider to reflect opacity — never ranked better on a midpoint alone.'}
        {' '}
        <a
          href={`${methodologyBase}/BOUNDARY.md`}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 opacity-60 hover:opacity-100"
        >
          {lang === 'zh' ? '边界' : 'Boundary'}
        </a>
        {' · '}
        <a
          href={`${methodologyBase}/FAIRNESS.md`}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 opacity-60 hover:opacity-100"
        >
          {lang === 'zh' ? '公正性' : 'Fairness'}
        </a>
      </p>
    </div>
  );
};
