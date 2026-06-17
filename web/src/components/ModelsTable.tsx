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
  // Phase 6m: server-computed tiers (list of slug lists) from totals.tiers.
  // When present, used for authoritative grouping (stable across alts).
  // When absent, component falls back to computing equivalent grouping locally
  // from the passed models' co2_kg ranges so the banded table is always shown.
  tiers?: string[][];
}

export const ModelsTable: React.FC<Props> = ({ models, lang = 'en', onInspect, isScenarioActive = false, tiers: incomingTiersProp }) => {
  const tt = useI18n(lang);
  const [sortKey, setSortKey] = useState<SortKey>('co2');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Phase 6m tier computation (early so sorted can primary-key on it)
  const computeClientTiers = (ms: Model[]): string[][] => {
    if (!ms.length) return [];
    const sortedByMidDesc = [...ms].sort((x, y) => y.co2_kg.mid - x.co2_kg.mid);
    const groups: string[][] = [];
    let cur = [sortedByMidDesc[0].slug];
    for (const m of sortedByMidDesc.slice(1)) {
      const minLow = Math.min(...cur.map(sl => {
        const found = ms.find(x => x.slug === sl);
        return found ? found.co2_kg.low : 0;
      }));
      if (m.co2_kg.high < minLow) {
        groups.push(cur);
        cur = [m.slug];
      } else {
        cur.push(m.slug);
      }
    }
    groups.push(cur);
    return groups;
  };
  const clientTiersRaw = computeClientTiers(models);
  const clientTiersBestFirst = clientTiersRaw.length ? clientTiersRaw.slice().reverse() : [];
  const serverTiersBestFirst = (incomingTiersProp && incomingTiersProp.length) ? incomingTiersProp.slice().reverse() : null;
  const effectiveTiers: string[][] = serverTiersBestFirst || clientTiersBestFirst;
  const tierMap = new Map<string, number>();
  effectiveTiers.forEach((group, idx) => {
    const tnum = idx + 1;
    group.forEach(sl => tierMap.set(sl, tnum));
  });
  const totalTierCount = effectiveTiers.length || 1;

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
    
    // Sort (Phase 6m: primary by tier asc (Tier 1 best first), secondary by chosen key)
    arr.sort((a, b) => {
      const ta = tierMap.get(a.slug) || 999;
      const tb = tierMap.get(b.slug) || 999;
      if (ta !== tb) {
        return ta - tb; // lower tier# (better) first
      }
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
      const sec = sortDir === 'desc' ? vb - va : va - vb;
      return sec;
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
        className={`px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] ${key ? 'cursor-pointer hover:bg-[var(--bg-elev)] transition-colors' : ''} whitespace-nowrap`}
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
      className="badge"
    >
      {f.replace(/_/g, ' ')}
    </span>
  );

  // Phase 6F: per-row precision tier badges — use theme classes (prominent, linkable flags untouched)
  const tierBadge = (label: string, measured: boolean) => (
    <span className={`badge ${measured ? 'badge-tier-measured' : 'badge-tier-fallback'}`}>
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

  // effectiveTiers + tierMap computed early (above) for sort + render grouping

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 card p-4">
        <div className="flex flex-col md:flex-row gap-3 items-center w-full xl:w-auto">
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <input
              type="text"
              className="block w-full pl-9 pr-3 py-2 border border-[var(--border)] rounded-xl bg-[var(--bg)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] text-sm"
              placeholder={tt.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
            <div className="flex gap-1 bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)]">
              {['ALL', 'CN', 'US', 'EU', 'OTHER'].map(o => (
                <button 
                  key={o} 
                  onClick={() => setOriginFilter(o)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${originFilter === o ? 'bg-[var(--accent-bg)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                >
                  {o === 'ALL' ? tt.all : o}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)]">
              {['ALL', 'open', 'closed'].map(t => (
                <button 
                  key={t} 
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${typeFilter === t ? 'bg-[var(--accent-bg)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
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
        <div className="text-xs px-4 py-1.5 rounded-lg bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[var(--accent)]">
          {tt.tableNote}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
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
            {(() => {
              const nodes: React.ReactNode[] = [];
              let prevT: number | null = null;
              sorted.forEach((m, i) => {
                const t = tierMap.get(m.slug) || 1;
                if (t !== prevT) {
                  nodes.push(
                    <tr key={`tierband-${t}`} className="bg-[var(--bg-elev)]">
                      <td colSpan={hasWater ? 10 : 9} className="px-4 py-1 text-[10px] font-bold uppercase tracking-[1px] text-[var(--accent)] border-b border-[var(--border)]">
                        {tt.tierBand(t, totalTierCount)}
                      </td>
                    </tr>
                  );
                  prevT = t;
                }
                const effG = co2Per1kOutputTokens(m);
                const isHighEmission = effG > 5.0;
                const isLowEmission = effG < 0.5;
                const isEnergyMeasured =
                  m.energy_source === 'ai_energy_score' || m.energy_source === 'ecologits';
                const isGridLive = m.grid_source === 'electricity_maps_live';
                const originClass = m.origin === 'CN' ? 'badge-cn' : m.origin === 'US' ? 'badge-us' : m.origin === 'EU' ? 'badge-eu' : 'badge';
                const displayRank = i + 1;
                nodes.push(
                  <tr key={m.slug} className={`border-b border-[var(--border)] hover:bg-[var(--bg-elev)] transition-colors ${i % 2 === 0 ? '' : 'bg-[var(--row-stripe)]'}`}>
                    <td className="px-4 py-2 font-semibold text-[var(--text)]">
                      <span className="inline-block align-middle px-1 py-px mr-1.5 text-[10px] font-bold rounded bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent-border)]">T{t}</span>
                      {m.display_name}
                      <span className="ml-1.5 text-[10px] text-[var(--text-muted)] font-mono">#{displayRank}</span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-[var(--text-secondary)]">
                      <span className="font-mono text-xs bg-[var(--bg)] px-2 py-px rounded border border-[var(--border)]">{formatCO2Range(m.co2_kg)}</span>
                    </td>
                    {hasWater && (
                      <td className="px-4 py-2 whitespace-nowrap text-[var(--text-secondary)]">
                        <span className="font-mono text-xs bg-[var(--bg-elev)] text-[var(--text)] px-2 py-px rounded border border-[var(--border)]">{formatWaterRange(m.water_liters)}</span>
                      </td>
                    )}
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`font-mono px-2 py-px rounded text-xs font-bold border ${
                        isHighEmission ? 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-border)]' :
                        isLowEmission ? 'bg-[var(--accent-bg)] text-[var(--accent)] border-[var(--accent-border)]' :
                        'bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--border)]'
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
                    <td className="px-4 py-2 text-xs text-[var(--text-muted)] max-w-[150px]" title={m.energy_source}>
                      <div className="flex flex-col gap-1">
                        {tierBadge(
                          isEnergyMeasured ? tt.tierMeasured : tt.tierClassFallback,
                          isEnergyMeasured,
                        )}
                        <span className="truncate text-[10px] opacity-70">{m.energy_source}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-[var(--text-muted)] max-w-[150px]" title={m.grid_source}>
                      <div className="flex flex-col gap-1">
                        {tierBadge(isGridLive ? tt.tierGridLive : tt.tierGridAnnual, isGridLive)}
                        <span className="truncate text-[10px] opacity-70">{m.grid_source}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 max-w-[170px] text-[11px]">{m.flags.length ? m.flags.map(flagBadge) : <span className="text-[var(--text-muted)]">—</span>}</td>
                    <td className="px-1 py-2">
                      {onInspect && (
                        <button onClick={() => onInspect(m)} className="text-[var(--text-muted)] hover:text-[var(--accent)] p-1" aria-label={tt.details} title={tt.details}>
                          <Eye size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              });
              if (sorted.length === 0) {
                nodes.push(
                  <tr key="no-match">
                    <td colSpan={hasWater ? 10 : 9} className="px-4 py-12 text-center text-[var(--text-muted)] bg-[var(--bg)]">
                      <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
                      <p>{tt.tableNoMatch}</p>
                    </td>
                  </tr>
                );
              }
              return nodes;
            })()}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-[var(--text-muted)] flex justify-between px-1">
        <span>{tt.tableNote || 'Click headers to sort. All values carry low–mid–high ranges.'}</span>
        <span>{sorted.length} models</span>
      </div>
    </div>
  );
};
