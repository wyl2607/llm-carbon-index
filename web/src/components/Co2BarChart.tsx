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

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { full: string; co2: number; open_or_closed: string; origin: string; } }[] }) => {
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

  return (
    <div className="w-full h-full flex flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 48, left: 4 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="#242924" vertical={false} />
          <XAxis
            dataKey="name"
            angle={-32}
            textAnchor="end"
            height={56}
            interval={0}
            tick={{ fontSize: 10, fill: '#717771' }}
            tickLine={{ stroke: '#242924' }}
            axisLine={{ stroke: '#242924' }}
          />
          <YAxis
            tickFormatter={(v) => (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)}
            tick={{ fontSize: 10, fill: '#717771' }}
            tickLine={{ stroke: '#242924' }}
            axisLine={{ stroke: '#242924' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16,185,129,0.06)' }} />
          <Bar dataKey="co2" radius={[2,2,0,0]}>
            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={getColor(entry)} />)}
            <ErrorBar dataKey="error" direction="y" strokeWidth={1} stroke="#334155" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="text-[10px] text-[#717771] mt-1 text-center">
        Mid + low/high whiskers. Grouped by {groupBy.replace('_', ' ')}.
      </div>
    </div>
  );
};
