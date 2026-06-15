import React from 'react';
import type { Totals } from '../types';
import { formatCO2Range, formatTokens, formatModeledFraction } from '../lib/format';

interface Props {
  totals: Totals;
}

export const KpiCards: React.FC<Props> = ({ totals }) => {
  // Calculate Avg gCO2e / 1k tokens (mid)
  const avgGCo2e = totals.total_tokens > 0 
    ? ((totals.co2_kg.mid * 1000) / (totals.total_tokens / 1000)).toFixed(2)
    : '0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Total Modeled Tokens</h3>
        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {formatTokens(totals.total_tokens)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Uncovered: {formatTokens(totals.uncovered_tokens)}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Total est. CO₂eq
        </h3>
        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {formatCO2Range(totals.co2_kg).split(' ')[0]} <span className="text-lg font-normal text-slate-500">kg</span>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Mid estimate (range: {Math.round(totals.co2_kg.low)}-{Math.round(totals.co2_kg.high)} kg)
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Avg Efficiency</h3>
        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {avgGCo2e} <span className="text-lg font-normal text-slate-500">gCO₂ / 1k</span>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Grams of CO₂ per 1,000 tokens
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800/50 shadow-sm flex flex-col justify-between">
        <h3 className="text-emerald-700 dark:text-emerald-400 text-sm font-medium mb-1">Data Coverage</h3>
        <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 tracking-tight">
          {formatModeledFraction(totals.modeled_traffic_fraction).split(':')[1]?.trim() || `${(totals.modeled_traffic_fraction * 100).toFixed(1)}%`}
        </p>
        <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2">
          Of OpenRouter visible traffic
        </p>
      </div>
    </div>
  );
};
