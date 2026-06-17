import React from 'react';
import type { Lang } from '../lib/i18n';
import { useI18n } from '../lib/i18n';

export type GroupBy = 'open_or_closed' | 'origin';

interface Props {
  groupBy: GroupBy;
  onChange: (g: GroupBy) => void;
  lang: Lang;
}

/**
 * GroupToggle — controls colouring/grouping of the bar chart (and conceptually other views)
 * by open_or_closed or by origin. Per phase-4-frontend.md.
 */
export const GroupToggle: React.FC<Props> = ({ groupBy, onChange, lang }) => {
  const tt = useI18n(lang);
  const btn = (val: GroupBy, label: string) => (
    <button
      type="button"
      onClick={() => onChange(val)}
      aria-pressed={groupBy === val}
      className={`px-3 py-1 text-xs font-semibold transition border-r border-[var(--border)] last:border-r-0 ${
        groupBy === val
          ? 'bg-[var(--accent)] text-[var(--bg)]'
          : 'bg-[var(--bg)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="font-medium text-[var(--text-muted)] pr-1">{/* Colour by */}{tt.groupLabel}</span>
      <div className="inline-flex rounded-md overflow-hidden border border-[var(--border)]">
        {btn('open_or_closed', tt.groupOpenClosed)}
        {btn('origin', tt.groupOrigin)}
      </div>
    </div>
  );
};
