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
      className="bg-amber-50 border border-amber-500/50 rounded-lg p-4 my-4 text-sm text-amber-900 shadow-sm dark:bg-amber-950/30 dark:border-amber-700/50 dark:text-amber-200 transition-colors"
    >
      <div className="flex flex-col gap-2">
        <p className="font-medium text-base flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Scope &amp; Honesty / 范围与声明
        </p>
        <p className="opacity-90">{scopeNote}</p>
        <p className="opacity-80 text-xs">{sourceCitation}</p>
        <div className="mt-2 p-3 bg-amber-100/50 dark:bg-amber-900/30 rounded border border-amber-200/50 dark:border-amber-800/50 italic font-medium">
          This project estimates the CO₂ footprint of <strong>OpenRouter-visible LLM inference</strong> — a representative but partial slice of global AI usage. It is <strong>NOT</strong> a measurement of total global data-center emissions. All figures are estimates with uncertainty ranges, not measurements.
          <br/>
          本项目仅估算 <strong>OpenRouter 可见的 LLM 推理</strong> 的碳足迹，这只是全球 AI 使用量的一个具代表性的切片。它 <strong>不是</strong> 全球数据中心总排放量的测量值。所有数据均为带有不确定性范围的估算值。
        </div>
      </div>
    </div>
  );
};
