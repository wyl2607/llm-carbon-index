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
import type { Lang } from '../lib/i18n';
import { useI18n } from '../lib/i18n';

interface Props {
  models: Model[];
  groupBy: GroupBy;
  showAll?: boolean;
  onToggleShowAll?: () => void;
  lang: Lang;
}

const CustomTooltip = ({ active, payload, co2Label }: { active?: boolean; payload?: { payload: { full: string; co2: number; open_or_closed: string; origin: string; } }[]; co2Label: string }) => {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-[#121512] border border-[#242924] p-3 rounded-lg shadow-lg text-sm text-[#e4e7e4]">
      <div className="font-semibold text-white mb-1">{p.full}</div>
      <div className="mb-1">
        <span className="font-medium">{co2Label}</span> {p.co2.toLocaleString()} kg
      </div>
      <div className="text-xs text-[#a1a6a1] mt-2">
        <span className="inline-block px-1.5 py-0.5 bg-[#1a1f1a] rounded mr-1 border border-[#242924]">
          {p.open_or_closed}
        </span>
        <span className="inline-block px-1.5 py-0.5 bg-[#1a1f1a] rounded border border-[#242924]">
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
export const Co2BarChart: React.FC<Props> = ({ models, groupBy, showAll = false, onToggleShowAll, lang }) => {
  const tt = useI18n(lang);
  // Sort by impact and take top 15 by default for readability (50 models is too many on x-axis)
  const sortedModels = [...models].sort((a, b) => b.co2_kg.mid - a.co2_kg.mid);
  const displayModels = showAll ? sortedModels : sortedModels.slice(0, 15);

  // Aggregate "others" when not showing all
  let chartData = displayModels.map((m) => {
    const mid = m.co2_kg.mid;
    const errLow = mid - m.co2_kg.low;
    const errHigh = m.co2_kg.high - mid;
    const short = m.display_name.length > 18 ? m.display_name.slice(0, 16) + '…' : m.display_name;
    return {
      name: short,
      co2: mid,
      error: [errLow, errHigh],
      origin: m.origin,
      open_or_closed: m.open_or_closed,
      full: m.display_name,
    };
  });

  if (!showAll && sortedModels.length > 15) {
    const othersMid = sortedModels.slice(15).reduce((sum, m) => sum + m.co2_kg.mid, 0);
    if (othersMid > 0) {
      chartData = [
        ...chartData,
        {
          name: tt.othersLabel(sortedModels.length - 15),
          co2: othersMid,
          error: [0, 0],
          origin: 'OTHER',
          open_or_closed: 'open',
          full: tt.remainingAggregated(sortedModels.length - 15),
        },
      ];
    }
  }

  const getColor = (d: (typeof chartData)[number]) => {
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

  const groupPhrase = groupBy === 'open_or_closed' ? tt.groupOpenClosed : tt.groupOrigin;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-end mb-1">
        {onToggleShowAll && (
          <button
            onClick={onToggleShowAll}
            className="text-xs px-3 py-1 rounded-lg border border-[#242924] hover:bg-[#1a1e1a] text-[#a1a6a1]"
          >
            {showAll ? tt.showTop15 : tt.showAll(models.length)}
          </button>
        )}
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 48, left: 4 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="#242924" vertical={false} />
          <XAxis
            dataKey="name"
            angle={-28}
            textAnchor="end"
            height={52}
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
          <Tooltip content={<CustomTooltip co2Label={tt.tooltipCo2} />} cursor={{ fill: 'rgba(16,185,129,0.06)' }} />
          <Bar dataKey="co2" radius={[2,2,0,0]}>
            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={getColor(entry)} />)}
            <ErrorBar dataKey="error" direction="y" strokeWidth={1} stroke="#334155" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="text-[10px] text-[#9ba19b] mt-1 text-center">
        {tt.chartMidWhiskers}{groupPhrase}. {showAll ? tt.chartAllShown : tt.chartTopAggregated}
      </div>
    </div>
  );
};
