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
      style={{
        padding: '6px 12px',
        border: groupBy === val ? '2px solid #111' : '1px solid #ccc',
        background: groupBy === val ? '#f4f4f5' : '#fff',
        borderRadius: 4,
        marginRight: 6,
        cursor: 'pointer',
        fontSize: '0.9em',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ margin: '8px 0 16px' }}>
      <span style={{ marginRight: 8, fontWeight: 500 }}>Colour / group by:</span>
      {btn('open_or_closed', 'Open vs Closed')}
      {btn('origin', 'Origin (CN / US / EU)')}
    </div>
  );
};
