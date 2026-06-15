import React, { useMemo, useState } from 'react';
import type { Model } from '../types';
import { co2Per1kOutputTokens, formatCO2Per1kG, formatCO2Range, formatWaterRange } from '../lib/format';

type SortKey = 'co2' | 'efficiency' | 'water';

interface Props {
  models: Model[];
}

/**
 * ModelsTable — sortable table.
 * Sortable by co2_kg.mid (total), water_liters.mid, and by efficiency = co2_kg.mid / est_output_tokens * 1000 (per 1k output tokens).
 * Always renders ranges (mid + low-high), never bare numbers.
 * Columns: display, range CO2, range Water, efficiency, origin, open/closed, energy_source, grid_source, flags (badges).
 * Responsive: horizontal scroll container on narrow screens.
 */
export const ModelsTable: React.FC<Props> = ({ models }) => {
  const [sortKey, setSortKey] = useState<SortKey>('co2');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  const sorted = useMemo(() => {
    let arr = [...models];
    
    // Filter
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      arr = arr.filter(m => 
        m.display_name.toLowerCase().includes(lower) || 
        m.origin.toLowerCase().includes(lower) ||
        m.energy_source.toLowerCase().includes(lower)
      );
    }
    
    // Sort
    arr.sort((a, b) => {
      let va: number = 0;
      let vb: number = 0;
      if (sortKey === 'co2') {
        va = a.co2_kg.mid;
        vb = b.co2_kg.mid;
      } else if (sortKey === 'water') {
        va = a.water_liters?.mid || 0;
        vb = b.water_liters?.mid || 0;
      } else {
        va = co2Per1kOutputTokens(a);
        vb = co2Per1kOutputTokens(b);
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });
    return arr;
  }, [models, sortKey, sortDir, searchTerm]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const header = (label: string, key?: SortKey) => {
    const active = key && sortKey === key;
    return (
      <th
        onClick={key ? () => toggleSort(key) : undefined}
        className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b-2 border-slate-200 dark:border-slate-700 ${key ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors' : ''} whitespace-nowrap`}
        aria-sort={active ? (sortDir === 'desc' ? 'descending' : 'ascending') : undefined}
      >
        <div className="flex items-center gap-1">
          {label}
          {active && (
            <svg className={`w-3 h-3 transition-transform ${sortDir === 'desc' ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
          )}
          {key && !active && (
            <svg className="w-3 h-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
          )}
        </div>
      </th>
    );
  };

  const flagBadge = (f: string) => (
    <span
      key={f}
      className="inline-block px-2 py-0.5 mr-1 mb-1 text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200 rounded dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800/50"
    >
      {f}
    </span>
  );

  const downloadCSV = () => {
    const headers = [
      'Model', 'CO2_kg_low', 'CO2_kg_mid', 'CO2_kg_high', 
      'Water_L_low', 'Water_L_mid', 'Water_L_high',
      'gCO2_per_1k_output_tokens', 'Origin', 'Open_Closed', 
      'Energy_Source', 'Grid_Source', 'Flags'
    ];
    
    const rows = sorted.map(m => [
      m.display_name,
      m.co2_kg.low,
      m.co2_kg.mid,
      m.co2_kg.high,
      m.water_liters?.low || '',
      m.water_liters?.mid || '',
      m.water_liters?.high || '',
      co2Per1kOutputTokens(m).toFixed(4),
      m.origin,
      m.open_or_closed,
      m.energy_source,
      m.grid_source,
      m.flags.join(';')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `llm-carbon-index-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md leading-5 bg-white dark:bg-slate-800 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors text-slate-900 dark:text-slate-100"
            placeholder="Filter models, origin, source..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button
          onClick={downloadCSV}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-all text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download CSV (Data Export)
        </button>
      </div>
      
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
        <table className="min-w-[820px] w-full text-sm divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              {header('Model')}
              {header('CO₂ (kg, range)', 'co2')}
              {header('Water (L, range)', 'water')}
              {header('CO₂ / 1k output tokens', 'efficiency')}
              {header('Origin')}
              {header('Open/Closed')}
              {header('Energy source')}
              {header('Grid source')}
              {header('Flags')}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {sorted.map((m, i) => {
              const effG = co2Per1kOutputTokens(m);
              // Calculate a simple color coding (high vs low relative to avg or arbitrary threshold)
              const isHighEmission = effG > 2.0; 
              const isLowEmission = effG < 0.2;
              
              return (
                <tr key={m.slug} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-800/50'}`}>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{m.display_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                    <span className="font-mono">{formatCO2Range(m.co2_kg)}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                    <span className="font-mono">{formatWaterRange(m.water_liters)}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`font-mono px-2 py-1 rounded text-xs font-semibold ${
                      isHighEmission ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                      isLowEmission ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                      'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {formatCO2Per1kG(effG)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 shadow-sm">
                      <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      {m.origin}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        m.open_or_closed === 'open' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50 shadow-sm shadow-emerald-100/50 dark:shadow-none' 
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/50 shadow-sm shadow-rose-100/50 dark:shadow-none'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${m.open_or_closed === 'open' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      {m.open_or_closed === 'open' ? 'Open' : 'Closed'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-[150px] truncate" title={m.energy_source}>{m.energy_source}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-[150px] truncate" title={m.grid_source}>{m.grid_source}</td>
                  <td className="px-4 py-3 max-w-[200px] flex-wrap">
                    {m.flags.length ? m.flags.map(flagBadge) : <span className="text-slate-400 italic text-xs">—</span>}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 italic">
                  No models found matching your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 flex justify-between items-center px-1">
        <span>Click column headers to sort. Range columns always show mid (low–high) ranges.</span>
        <span>Showing {sorted.length} model{sorted.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
};
