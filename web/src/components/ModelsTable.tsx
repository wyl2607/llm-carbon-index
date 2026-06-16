import React, { useMemo, useState } from 'react';
import type { Model } from '../types';
import { co2Per1kOutputTokens, formatCO2Per1kG, formatCO2Range, formatWaterRange } from '../lib/format';
import { Search, Download, Eye } from 'lucide-react';
import type { Lang } from '../lib/i18n';
import { useI18n } from '../lib/i18n';

type SortKey = 'co2' | 'efficiency' | 'water';

interface Props {
  models: Model[];
  lang?: Lang;
  onInspect?: (m: Model) => void;
  isScenarioActive?: boolean;
}

export const ModelsTable: React.FC<Props> = ({ models, lang = 'en', onInspect, isScenarioActive = false }) => {
  const tt = useI18n(lang);
  const [sortKey, setSortKey] = useState<SortKey>('co2');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const sorted = useMemo(() => {
    let arr = [...models];
    
    // Filter by search
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      arr = arr.filter(m => 
        m.display_name.toLowerCase().includes(lower) || 
        m.energy_source.toLowerCase().includes(lower) ||
        m.flags.some(f => f.toLowerCase().includes(lower))
      );
    }

    // Filter by origin
    if (originFilter !== 'ALL') {
      arr = arr.filter(m => m.origin === originFilter);
    }

    // Filter by type (open/closed)
    if (typeFilter !== 'ALL') {
      arr = arr.filter(m => m.open_or_closed === typeFilter);
    }
    
    // Sort
    arr.sort((a, b) => {
      let va: number;
      let vb: number;
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
  }, [models, sortKey, sortDir, searchTerm, originFilter, typeFilter]);

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
        className={`px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50 ${key ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors' : ''} whitespace-nowrap`}
        aria-sort={active ? (sortDir === 'desc' ? 'descending' : 'ascending') : undefined}
      >
        <div className="flex items-center gap-1.5">
          {label}
          {active && (
            <svg className={`w-3.5 h-3.5 transition-transform ${sortDir === 'desc' ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
          )}
          {key && !active && (
            <svg className="w-3.5 h-3.5 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
          )}
        </div>
      </th>
    );
  };

  const flagBadge = (f: string) => (
    <span
      key={f}
      className="inline-block px-2 py-0.5 mr-1.5 mb-1.5 text-[10px] font-bold bg-warning-bg text-warning border border-warning-border  dark:bg-warning-bg dark:text-warning dark:border-warning-border uppercase tracking-wide"
    >
      {f.replace(/_/g, ' ')}
    </span>
  );

  // Phase 6F: per-row precision tier, same badge mechanism as flags.
  // Emerald = measured/live (trustworthy), amber = fallback estimate.
  const tierBadge = (label: string, measured: boolean) => (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] font-bold  uppercase tracking-wide border ${
        measured
          ? 'bg-accent-bg text-accent border-accent-border'
          : 'bg-warning-bg text-warning border-warning-border'
      }`}
    >
      {label}
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

  const isScenario = isScenarioActive;
  const hasWater = models.some(m => !!m.water_liters && m.water_liters.mid > 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 card p-4">
        <div className="flex flex-col md:flex-row gap-3 items-center w-full xl:w-auto">
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-text" />
            </div>
            <input
              type="text"
              className="block w-full pl-9 pr-3 py-2 border border-border  bg-bg-card placeholder-[#717771] focus:border-accent-border text-sm"
              placeholder={tt.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
            <div className="flex gap-1 bg-bg-card p-1  border border-border">
              {['ALL', 'CN', 'US', 'EU', 'OTHER'].map(o => (
                <button 
                  key={o} 
                  onClick={() => setOriginFilter(o)}
                  className={`px-3 py-1.5  font-medium transition-colors ${originFilter === o ? 'bg-accent-bg text-accent' : 'text-text-muted hover:text-text-muted'}`}
                >
                  {o === 'ALL' ? tt.all : o}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-bg-card p-1  border border-border">
              {['ALL', 'open', 'closed'].map(t => (
                <button 
                  key={t} 
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5  font-medium transition-colors ${typeFilter === t ? 'bg-bg-elev text-text-muted' : 'text-text-muted hover:text-text-muted'}`}
                >
                  {t === 'ALL' ? tt.all : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={downloadCSV} className="btn btn-secondary text-sm">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button 
            onClick={() => {
              const payload = {
                exported_at: new Date().toISOString(),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                scenario: { greenShiftPercent: (window as any).__currentShift || 0, accountingMethod: 'location-or-market' },
                note: 'All values reflect the active grid substitution scenario. Ranges are low/mid/high.',
                models: sorted.map(m => ({
                  ...m,
                  co2_kg: m.co2_kg,
                  energy_kwh: m.energy_kwh,
                }))
              };
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `llm-carbon-index-scenario-${new Date().toISOString().slice(0,10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }} 
            className="btn btn-secondary text-sm"
          >
            JSON
          </button>
        </div>
      </div>

      {isScenario && (
        <div className="text-xs px-4 py-1.5  bg-accent-bg border border-accent-border text-accent">
          {tt.tableNote}
        </div>
      )}

      <div className="overflow-x-auto  border border-border bg-bg-card">
        <table className={`${hasWater ? 'min-w-[980px]' : 'min-w-[880px]'} w-full text-sm`}>
          <thead>
            <tr>
              {header(tt.colModel)}
              {header(tt.colCo2, 'co2')}
              {hasWater && header(tt.colWater, 'water')}
              {header(tt.colEff, 'efficiency')}
              {header(tt.colOrigin)}
              {header(tt.colOpenClosed)}
              {header(tt.colEnergySrc)}
              {header(tt.colGridSrc)}
              {header(tt.colFlags)}
              <th className="px-3 py-3 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {sorted.map((m, i) => {
              const effG = co2Per1kOutputTokens(m);
              const isHighEmission = effG > 5.0;
              const isLowEmission = effG < 0.5;
              const isEnergyMeasured =
                m.energy_source === 'ai_energy_score' || m.energy_source === 'ecologits';
              const isGridLive = m.grid_source === 'electricity_maps_live';
              const originClass = m.origin === 'CN' ? 'badge-cn' : m.origin === 'US' ? 'badge-us' : m.origin === 'EU' ? 'badge-eu' : 'badge';
              
              return (
                <tr key={m.slug} className={`border-b border-border hover:bg-bg-card transition-colors ${i % 2 === 0 ? '' : 'bg-bg-card'}`}>
                  <td className="px-4 py-2 font-semibold text-text">{m.display_name}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-text">
                    <span className="font-mono text-xs bg-bg-card px-2 py-px rounded border border-border">{formatCO2Range(m.co2_kg)}</span>
                  </td>
                  {hasWater && (
                    <td className="px-4 py-2 whitespace-nowrap text-text">
                      <span className="font-mono text-xs bg-bg-elev text-text-muted px-2 py-px rounded border border-border">{formatWaterRange(m.water_liters)}</span>
                    </td>
                  )}
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`font-mono px-2 py-px rounded text-xs font-bold border ${
                      isHighEmission ? 'bg-rose-950/40 text-rose-400 border-rose-900/40' :
                      isLowEmission ? 'bg-accent-bg text-accent border-accent-border' :
                      'bg-bg-card text-text border-border'
                    }`}>
                      {formatCO2Per1kG(effG)}
                    </span>
                  </td>
                  <td className="px-4 py-2"><span className={`badge ${originClass}`}>{m.origin}</span></td>
                  <td className="px-4 py-2">
                    <span className={m.open_or_closed === 'open' ? 'badge badge-open' : 'badge badge-closed'}>
                      {m.open_or_closed}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-text max-w-[150px]" title={m.energy_source}>
                    <div className="flex flex-col gap-1">
                      {tierBadge(
                        isEnergyMeasured ? tt.tierMeasured : tt.tierClassFallback,
                        isEnergyMeasured,
                      )}
                      <span className="truncate text-[10px] opacity-70">{m.energy_source}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs text-text max-w-[150px]" title={m.grid_source}>
                    <div className="flex flex-col gap-1">
                      {tierBadge(isGridLive ? tt.tierGridLive : tt.tierGridAnnual, isGridLive)}
                      <span className="truncate text-[10px] opacity-70">{m.grid_source}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 max-w-[170px] text-[11px]">{m.flags.length ? m.flags.map(flagBadge) : <span className="text-text">—</span>}</td>
                  <td className="px-1 py-2">
                    {onInspect && (
                      <button onClick={() => onInspect(m)} className="text-text hover:text-accent p-1" aria-label={tt.details} title={tt.details}>
                        <Eye size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={hasWater ? 10 : 9} className="px-4 py-12 text-center text-text bg-bg-card">
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p>No models match current filters.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-text flex justify-between px-1">
        <span>{tt.tableNote || 'Click headers to sort. All values carry low–mid–high ranges.'}</span>
        <span>{sorted.length} models</span>
      </div>
    </div>
  );
};
