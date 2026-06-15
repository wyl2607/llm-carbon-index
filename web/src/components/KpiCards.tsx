import React from 'react';
import type { Totals } from '../types';
import { formatCO2Range, formatTokens } from '../lib/format';

interface Props {
  totals: Totals;
}

export const KpiCards: React.FC<Props> = ({ totals }) => {
  // Calculate Avg gCO2e / 1k tokens (mid)
  const avgGCo2e = totals.total_tokens > 0 
    ? ((totals.co2_kg.mid * 1000) / (totals.total_tokens / 1000)).toFixed(2)
    : '0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 my-10">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
        <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Total Modeled Tokens</h3>
        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          {formatTokens(totals.total_tokens)}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 font-medium">
          Uncovered: {formatTokens(totals.uncovered_tokens)}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
          <svg className="w-12 h-12 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.334-.398-1.817a1 1 0 00-1.514-.857 7.016 7.016 0 00-2.151 1.914c-1.178 1.573-1.798 3.595-1.798 5.657 0 3.52 2.348 6.566 5.923 7.429a1 1 0 00.79-.114 1 1 0 00.44-.807 5.043 5.043 0 01.107-1.085 1 1 0 00-.273-.877c-.309-.282-.547-.633-.72-1.013-.242-.534-.351-1.136-.351-1.685a2.727 2.727 0 011.325-2.297 1 1 0 00.458-1.106 8.295 8.295 0 01-.09-1.222c0-.927.103-1.84.3-2.703a33.3 33.3 0 01.48-1.711c.172-.476.33-.86.405-1.018z" clipRule="evenodd"></path><path d="M12.99 3.83a1 1 0 00-1.936.505c.166.63.272 1.285.34 1.954 1.72.126 3.108 1.561 3.108 3.326 0 .234-.027.47-.08.697l-.018.068a1 1 0 001.396 1.15l.073-.033a7 7 0 003.203-3.903 1 1 0 00-.65-1.284 7.021 7.021 0 00-5.436-1.482z"></path></svg>
        </div>
        <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
          Total est. CO₂eq
        </h3>
        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          {formatCO2Range(totals.co2_kg).split(' ')[0]} <span className="text-lg font-bold text-slate-400 dark:text-slate-500">kg</span>
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 font-medium">
          Mid point (Range: {Math.round(totals.co2_kg.low)}—{Math.round(totals.co2_kg.high)} kg)
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
        <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Avg Intensity</h3>
        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          {avgGCo2e} <span className="text-lg font-bold text-slate-400 dark:text-slate-500">g/1k</span>
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 font-medium">
          Grams of CO₂ per 1,000 output tokens
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800/50 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
          <svg className="w-12 h-12 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2c-1.716 0-3.408.106-5.07.31C4.93 2.31 4.93 2.31 4.93 2.31c-.686.085-1.12.74-1.04 1.43l.5 4.5A2.001 2.001 0 006 10h8a2.001 2.001 0 001.61-1.76l.5-4.5c.08-.69-.354-1.345-1.04-1.43C13.408 2.106 11.716 2 10 2zm0 16c1.716 0 3.408-.106 5.07-.31.686-.085 1.12-.74 1.04-1.43l-.5-4.5A2.001 2.001 0 0014 10H6a2.001 2.001 0 00-1.61 1.76l-.5 4.5c-.08.69.354 1.345 1.04 1.43C6.592 17.894 8.284 18 10 18z" clipRule="evenodd"></path></svg>
        </div>
        <h3 className="text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-2">Total est. Water</h3>
        <p className="text-4xl font-black text-blue-900 dark:text-blue-100 tracking-tight">
          {totals.water_liters ? (totals.water_liters.mid / 1000).toFixed(1) : 0} <span className="text-lg font-bold text-blue-400 dark:text-blue-500">kL</span>
        </p>
        <p className="text-xs text-blue-600/80 dark:text-blue-500 mt-4 font-bold flex items-center gap-1">
          Mid point cooling water
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800/50 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
          <svg className="w-12 h-12 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd"></path></svg>
        </div>
        <h3 className="text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2">Substitution Potential</h3>
        <p className="text-4xl font-black text-emerald-900 dark:text-emerald-100 tracking-tight">
          ~{((totals.modeled_traffic_fraction) * 42).toFixed(1)}%
        </p>
        <p className="text-xs text-emerald-600/80 dark:text-emerald-500 mt-4 font-bold flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Green grid mitigation
        </p>
      </div>
    </div>
  );
};
