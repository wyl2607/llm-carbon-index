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
      return d.open_or_closed === 'open' ? '#10b981' : '#f43f5e'; // tailwind emerald-500, rose-500
    }
    // origin
    switch (d.origin) {
      case 'CN':
        return '#f97316'; // orange-500
      case 'US':
        return '#3b82f6'; // blue-500
      case 'EU':
        return '#8b5cf6'; // violet-500
      default:
        return '#64748b'; // slate-500
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-lg text-sm text-slate-700 dark:text-slate-200">
        <div className="font-semibold text-slate-900 dark:text-white mb-1">{p.full}</div>
        <div className="mb-1">
          <span className="font-medium">CO₂:</span> {p.co2.toLocaleString()} kg
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          <span className="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded mr-1">
            {p.open_or_closed}
          </span>
          <span className="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
            {p.origin}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 60, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.5} />
          <XAxis
            dataKey="name"
            angle={-35}
            textAnchor="end"
            height={70}
            interval={0}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={{ stroke: '#cbd5e1' }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis
            tickFormatter={(v) => (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)}
            label={{ value: 'CO₂ (kg)', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#64748b' }}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={{ stroke: '#cbd5e1' }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
          <Bar dataKey="co2" name="CO₂ mid (kg)" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry)} />
            ))}
            <ErrorBar dataKey="error" direction="y" strokeWidth={1.5} stroke="#334155" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
        Bars = CO₂ mid estimate; whiskers = full range (low–high). Colored by {groupBy.replace('_', ' ')}.
      </div>
    </div>
  );
};
