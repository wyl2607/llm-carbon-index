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
      className={`px-3 py-1 text-xs font-semibold transition border-r border-border last:border-r-0 ${
        groupBy === val
          ? 'bg-accent-bg text-black'
          : 'bg-bg-card hover:bg-bg-card text-text'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="font-medium text-text pr-1">{/* Colour by */}Group:</span>
      <div className="inline-flex  overflow-hidden border border-border">
        {btn('open_or_closed', 'Open / Closed')}
        {btn('origin', 'Origin')}
      </div>
    </div>
  );
};
