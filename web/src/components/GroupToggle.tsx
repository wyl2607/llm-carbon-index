import React from 'react';

export type GroupBy = 'open_or_closed' | 'origin';

interface Props {
  groupBy: GroupBy;
  onChange: (g: GroupBy) => void;
}

/**
 * GroupToggle — controls colouring/grouping of the bar chart (and conceptually other views)
 * by open_or_closed or by origin. Per phase-4-frontend.md.
 */
export const GroupToggle: React.FC<Props> = ({ groupBy, onChange }) => {
  const btn = (val: GroupBy, label: string) => (
    <button
      type="button"
      onClick={() => onChange(val)}
      aria-pressed={groupBy === val}
      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors border ${
        groupBy === val
          ? 'bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-900/50 dark:border-emerald-500 dark:text-emerald-100 shadow-sm'
          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-3 my-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Colour / Group by:</span>
      <div className="flex gap-2">
        {btn('open_or_closed', 'Open vs Closed')}
        {btn('origin', 'Origin')}
      </div>
    </div>
  );
};
