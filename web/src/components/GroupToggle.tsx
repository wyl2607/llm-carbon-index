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
      className={`px-3 py-1 text-xs font-semibold transition border-r border-[#242924] last:border-r-0 ${
        groupBy === val
          ? 'bg-emerald-600 text-black'
          : 'bg-[#0a0c0a] hover:bg-[#1a1e1a] text-[#a1a6a1]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="font-medium text-[#9ba19b] pr-1">{/* Colour by */}Group:</span>
      <div className="inline-flex rounded-md overflow-hidden border border-[#242924]">
        {btn('open_or_closed', 'Open / Closed')}
        {btn('origin', 'Origin')}
      </div>
    </div>
  );
};
