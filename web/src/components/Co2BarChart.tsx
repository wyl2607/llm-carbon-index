import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  ErrorBar,
} from 'recharts';
import type { Model } from '../types';
import type { GroupBy } from './GroupToggle';

interface Props {
  models: Model[];
  groupBy: GroupBy;
}

/**
 * Co2BarChart — Recharts bar chart of co2_kg.mid with error bars (low/high).
 * Colors are driven by the GroupToggle (open/closed or origin).
 * ErrorBar uses deltas for asymmetric ranges.
 */
export const Co2BarChart: React.FC<Props> = ({ models, groupBy }) => {
  // Prepare data for Recharts. Keep display_name short for x-axis.
  const data = models.map((m) => {
    const mid = m.co2_kg.mid;
    const errLow = mid - m.co2_kg.low;
    const errHigh = m.co2_kg.high - mid;
    const short = m.display_name.length > 22 ? m.display_name.slice(0, 20) + '…' : m.display_name;
    return {
      name: short,
      co2: mid,
      error: [errLow, errHigh], // asymmetric [down, up] for ErrorBar
      origin: m.origin,
      open_or_closed: m.open_or_closed,
      full: m.display_name,
    };
  });

  const getColor = (d: (typeof data)[number]) => {
    if (groupBy === 'open_or_closed') {
      return d.open_or_closed === 'open' ? '#16a34a' : '#dc2626';
    }
    // origin
    switch (d.origin) {
      case 'CN':
        return '#ea580c';
      case 'US':
        return '#2563eb';
      case 'EU':
        return '#7c3aed';
      default:
        return '#4b5563';
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0].payload;
    return (
      <div
        style={{
          background: '#fff',
          border: '1px solid #ddd',
          padding: '8px 10px',
          fontSize: '13px',
          borderRadius: 4,
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ fontWeight: 600 }}>{p.full}</div>
        <div>
          CO₂: {p.co2.toLocaleString()} kg (range shown by whiskers)
        </div>
        <div style={{ fontSize: '11px', color: '#555' }}>
          {p.open_or_closed} · {p.origin}
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height: 320, margin: '12px 0' }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 60, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-35}
            textAnchor="end"
            height={70}
            interval={0}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tickFormatter={(v) => (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)}
            label={{ value: 'CO₂ (kg)', angle: -90, position: 'insideLeft', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="co2" name="CO₂ mid (kg)">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry)} />
            ))}
            {/* Error bars for the full {low, mid, high} range */}
            <ErrorBar dataKey="error" direction="y" strokeWidth={1.5} stroke="#111" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ fontSize: '11px', color: '#666', marginTop: -8 }}>
        Bars = co2_kg.mid ; whiskers = full low–high range. Colour by {groupBy.replace('_', ' ')}.
      </div>
    </div>
  );
};
