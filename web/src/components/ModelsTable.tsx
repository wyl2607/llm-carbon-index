import React, { useMemo, useState } from 'react';
import type { Model } from '../types';
import { co2Per1kOutputTokens, formatCO2Per1kG, formatCO2Range } from '../lib/format';

type SortKey = 'co2' | 'efficiency';

interface Props {
  models: Model[];
}

/**
 * ModelsTable — sortable table.
 * Sortable by co2_kg.mid (total) and by efficiency = co2_kg.mid / est_output_tokens * 1000 (per 1k output tokens).
 * Always renders ranges (mid + low-high), never bare numbers.
 * Columns: display, range CO2, efficiency, origin, open/closed, energy_source, grid_source, flags (badges).
 * Responsive: horizontal scroll container on narrow screens.
 */
export const ModelsTable: React.FC<Props> = ({ models }) => {
  const [sortKey, setSortKey] = useState<SortKey>('co2');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const sorted = useMemo(() => {
    const arr = [...models];
    arr.sort((a, b) => {
      let va: number;
      let vb: number;
      if (sortKey === 'co2') {
        va = a.co2_kg.mid;
        vb = b.co2_kg.mid;
      } else {
        va = co2Per1kOutputTokens(a);
        vb = co2Per1kOutputTokens(b);
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });
    return arr;
  }, [models, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc'); // default new column to largest-first
    }
  };

  const header = (label: string, key?: SortKey) => {
    const active = key && sortKey === key;
    return (
      <th
        onClick={key ? () => toggleSort(key) : undefined}
        style={{
          cursor: key ? 'pointer' : 'default',
          userSelect: 'none',
          padding: '8px 6px',
          borderBottom: '2px solid #ddd',
          textAlign: 'left',
          whiteSpace: 'nowrap',
        }}
        aria-sort={active ? (sortDir === 'desc' ? 'descending' : 'ascending') : undefined}
      >
        {label}
        {active ? (sortDir === 'desc' ? ' ↓' : ' ↑') : key ? ' ↕' : ''}
      </th>
    );
  };

  const flagBadge = (f: string) => (
    <span
      key={f}
      style={{
        display: 'inline-block',
        fontSize: '10px',
        background: '#fef3c7',
        color: '#92400e',
        padding: '1px 5px',
        borderRadius: 3,
        marginRight: 3,
        border: '1px solid #f59e0b',
      }}
    >
      {f}
    </span>
  );

  return (
    <div style={{ overflowX: 'auto', margin: '12px 0' }}>
      <table
        style={{
          width: '100%',
          minWidth: 820,
          borderCollapse: 'collapse',
          fontSize: '13px',
        }}
      >
        <thead>
          <tr>
            {header('Model')}
            {header('CO₂ (kg, range)', 'co2')}
            {header('CO₂ / 1k output tokens', 'efficiency')}
            {header('Origin')}
            {header('Open/Closed')}
            {header('Energy source')}
            {header('Grid source')}
            {header('Flags')}
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => {
            const effG = co2Per1kOutputTokens(m);
            return (
              <tr key={m.slug} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '6px 4px', fontWeight: 500 }}>{m.display_name}</td>
                <td style={{ padding: '6px 4px', whiteSpace: 'nowrap' }}>{formatCO2Range(m.co2_kg)}</td>
                <td style={{ padding: '6px 4px', whiteSpace: 'nowrap' }}>{formatCO2Per1kG(effG)}</td>
                <td style={{ padding: '6px 4px' }}>{m.origin}</td>
                <td style={{ padding: '6px 4px' }}>
                  <span
                    style={{
                      padding: '1px 6px',
                      borderRadius: 3,
                      background: m.open_or_closed === 'open' ? '#dcfce7' : '#fee2e2',
                      color: m.open_or_closed === 'open' ? '#166534' : '#991b1b',
                    }}
                  >
                    {m.open_or_closed}
                  </span>
                </td>
                <td style={{ padding: '6px 4px' }}>{m.energy_source}</td>
                <td style={{ padding: '6px 4px' }}>{m.grid_source}</td>
                <td style={{ padding: '6px 4px' }}>
                  {m.flags.length ? m.flags.map(flagBadge) : <span style={{ color: '#aaa' }}>—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ fontSize: '11px', color: '#666', marginTop: 4 }}>
        Click column headers to sort. CO₂ columns always show mid (low–high) range.
      </div>
    </div>
  );
};
