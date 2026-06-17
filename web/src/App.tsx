import { useEffect, useState, useMemo } from 'react';
import type { LatestData, Model, SensitivityData } from './types';
import type { Lang } from './lib/i18n';
import { useI18n } from './lib/i18n';
import { ScopeDisclaimerBanner } from './components/ScopeDisclaimerBanner';
import { PrecisionBanner } from './components/PrecisionBanner';
import { FairnessNote } from './components/FairnessNote';
import { GroupToggle, type GroupBy } from './components/GroupToggle';
import { Co2BarChart } from './components/Co2BarChart';
import { ModelsTable } from './components/ModelsTable';
import { KpiCards } from './components/KpiCards';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { EsgExportPanel } from './components/EsgExportPanel';
import { AccountingToggle, type AccountingMethod } from './components/AccountingToggle';
import { HistoryViewer } from './components/HistoryViewer';
import { OriginDonut } from './components/OriginDonut';
import { ModelDetailModal } from './components/ModelDetailModal';
import { shiftedCo2Kg } from './lib/scenario';
import { formatCO2Range, formatWaterRange } from './lib/format';
import { Zap } from 'lucide-react';

const isSampleData = (models: Model[]) =>
  models.length > 0 && models[0].slug.startsWith('example/');

function App() {
  const [data, setData] = useState<LatestData | null>(null);
  const [sensData, setSensData] = useState<SensitivityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Core interactive state
  const [lang, setLang] = useState<Lang>(() => {
    const l = new URLSearchParams(window.location.search).get('lang');
    return (l === 'en' || l === 'zh' || l === 'de') ? l : 'en';
  });
  const [greenShiftPercent, setGreenShiftPercent] = useState<number>(() => {
    const s = new URLSearchParams(window.location.search).get('shift');
    return s ? Math.max(0, Math.min(100, parseInt(s, 10) || 0)) : 0;
  });
  const [accountingMethod, setAccountingMethod] = useState<AccountingMethod>(() => {
    const acc = new URLSearchParams(window.location.search).get('acc');
    return (acc === 'location' || acc === 'market') ? acc : 'location';
  });
  const [groupBy, setGroupBy] = useState<GroupBy>('open_or_closed');
  const [showAllModels, setShowAllModels] = useState(false);

  const [inspectModel, setInspectModel] = useState<Model | null>(null);

  // Persist key state to URL
  useEffect(() => {
    const p = new URLSearchParams();
    if (greenShiftPercent > 0) p.set('shift', String(greenShiftPercent));
    if (accountingMethod !== 'location') p.set('acc', accountingMethod);
    if (lang !== 'en') p.set('lang', lang);
    const qs = p.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, [greenShiftPercent, accountingMethod, lang]);

  // Data load
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/latest.json`).then(res => res.json()),
      fetch(`${import.meta.env.BASE_URL}data/timeseries.json`).then(res => res.json()),
      fetch(`${import.meta.env.BASE_URL}data/sensitivity.json`).then(res => res.ok ? res.json() : null)
    ]).then(([latestJson, _historyJson, sensJson]) => {
      if (!cancelled) {
        setData(latestJson);
        setSensData(sensJson);
        setError(null);
        setLoading(false);
      }
    }).catch(err => {
      if (!cancelled) {
        setError(err.message);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const tt = useI18n(lang);

  // Compute simulated (scenario) data
  const simulatedData = useMemo(() => {
    if (!data) return null;
    const useMarket = accountingMethod === 'market';

    const simulatedModels = data.models.map(m => {
      const baseCo2 = (useMarket && m.co2_kg_market) ? m.co2_kg_market : m.co2_kg;
      if (greenShiftPercent === 0) return { ...m, co2_kg: baseCo2 };

      const simulateRange = (val: number) => {
        if (useMarket && m.renewable_match_pct === 100) return 0;
        return shiftedCo2Kg(val, m.pue, m.carbon_intensity_gco2_kwh, greenShiftPercent);
      };
      return {
        ...m,
        co2_kg: {
          low: simulateRange(m.energy_kwh.low),
          mid: simulateRange(m.energy_kwh.mid),
          high: simulateRange(m.energy_kwh.high),
        }
      };
    });

    const totalCo2 = simulatedModels.reduce(
      (acc, m) => ({ low: acc.low + m.co2_kg.low, mid: acc.mid + m.co2_kg.mid, high: acc.high + m.co2_kg.high }),
      { low: 0, mid: 0, high: 0 }
    );

    return { ...data, models: simulatedModels, totals: { ...data.totals, co2_kg: totalCo2 } };
  }, [data, greenShiftPercent, accountingMethod]);

  const models = simulatedData?.models ?? [];
  const totals = simulatedData?.totals;
  const baselineCo2 = (accountingMethod === 'market' && data?.totals?.co2_kg_market) ? data.totals.co2_kg_market : data?.totals?.co2_kg;

  const isScenario = greenShiftPercent > 0;
  const sample = isSampleData(models);

  const renderSkeleton = () => (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="h-9 w-72 skeleton" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 card skeleton" />)}
      </div>
      <div className="h-80 card skeleton" />
      <div className="h-64 card skeleton" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] selection:bg-[var(--accent-bg)]">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="font-black tracking-[-0.5px] text-lg">LLM Carbon Index</div>
            {data && <div className="text-[10px] px-2 py-px rounded bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent-border)] font-bold tracking-widest">v{data.methodology_version}</div>}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value as Lang)}
              className="text-xs py-1 px-2 bg-[var(--bg-elev)] border border-[var(--border)] rounded-lg text-[var(--text)] hover:bg-[var(--bg-card)] cursor-pointer"
            >
              <option value="de">{tt.langDe}</option>
              <option value="zh">{tt.langZh}</option>
              <option value="en">{tt.langEn}</option>
            </select>

            <AccountingToggle method={accountingMethod} onChange={setAccountingMethod} lang={lang} />

            <a href="https://github.com/wyl2607/llm-carbon-index/blob/main/docs/methodology.md" target="_blank" rel="noreferrer" className="btn btn-secondary hidden sm:inline-flex text-xs py-1.5 px-4">{tt.methodology}</a>
            <a href="https://github.com/wyl2607/llm-carbon-index" target="_blank" rel="noreferrer" className="btn btn-secondary text-xs py-1.5 px-4">{tt.github}</a>
          </div>
        </div>
      </header>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-16">
        {/* Hero Area: Large Title + KPI Cards (Immediate Context) */}
        <div className="pt-10 pb-8 sm:pt-16 sm:pb-12">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-sm text-[var(--text-muted)] font-mono">
                  {tt.methodologyVersion}{data ? data.methodology_version : '—'} • {data ? data.data_date : '—'}
                </div>
                {/* L1 UI staleness indicator (phase 6L).
                    Driven by JSON data_date. N=7 days (see comment).
                    Prominent, never buried. Localized keys have parity. */}
                {data?.data_date && (() => {
                  const d = new Date(data.data_date + 'T00:00:00Z');
                  const ageDays = isNaN(d.getTime()) ? 0 : Math.floor((Date.now() - d.getTime()) / 86400000);
                  const isStale = ageDays > 7; // N=7 threshold per spec requirement
                  const label = tt.stalenessNote ? tt.stalenessNote(data.data_date) : `data as of ${data.data_date}`;
                  return (
                    <span
                      className={`staleness ${isStale ? 'stale' : ''}`}
                      title={label}
                      aria-label={label}
                    >
                      {isStale ? label : (tt.stalenessNoteShort || (ageDays + 'd'))}
                    </span>
                  );
                })()}
              </div>
              <h1 className="text-6xl sm:text-8xl font-black tracking-[-3px] text-[var(--text)] mb-6 leading-[0.9]">
                {tt.heroTitle}
              </h1>
              <div className="space-y-4">
                <p className="text-2xl sm:text-3xl text-[var(--accent)] font-bold tracking-tight leading-tight">
                  {tt.heroSubtitle}
                </p>
                <p className="text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl font-medium">
                  {tt.heroDesc} 
                  <span className="block mt-2 opacity-60 font-normal italic">
                    {tt.heroDescSub}
                  </span>
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 lg:pb-2">
              <a 
                href="https://github.com/wyl2607/llm-carbon-index/blob/main/docs/methodology.md" 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-primary px-8 py-4 text-base shadow-xl"
              >
                {tt.btnDocs}
              </a>
              <button 
                onClick={() => {
                  const url = window.location.href;
                  navigator.clipboard.writeText(url).then(() => alert(tt.citeCopied));
                }}
                className="btn btn-secondary px-8 py-4 text-base"
              >
                {tt.btnShare}
              </button>
            </div>
          </div>

          {/* KPIs — high impact immediate context */}
          {totals && (
            <KpiCards
              totals={totals}
              baselineCo2={baselineCo2}
              shift={greenShiftPercent}
              lang={lang}
              modeledFraction={data?.totals?.modeled_traffic_fraction}
            />
          )}

          {/* v0.2 lifecycle + water strip — operational vs embodied vs total + water */}
          {totals?.co2_kg_total && totals?.co2_kg_embodied && (
            <div className="mt-5 rounded-2xl border border-[var(--border)] bg-black/30 p-5">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--accent)]/80 mb-3">{tt.lcaTitle}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-[11px] text-[var(--text-muted)] mb-0.5">{tt.lcaOperational}</div>
                  <div className="font-mono text-[var(--text)]">{formatCO2Range(totals.co2_kg)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--text-muted)] mb-0.5">{tt.lcaEmbodied}</div>
                  <div className="font-mono text-[var(--text-secondary)]">{formatCO2Range(totals.co2_kg_embodied)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--accent)]/80 mb-0.5">{tt.lcaTotal}</div>
                  <div className="font-mono text-[var(--accent)] font-semibold">{formatCO2Range(totals.co2_kg_total)}</div>
                </div>
                {totals.water_liters && (
                  <div>
                    <div className="text-[11px] text-[var(--accent)]/70 mb-0.5">{tt.lcaWater}</div>
                    <div className="font-mono text-[var(--accent-light)]">{formatWaterRange(totals.water_liters)}</div>
                  </div>
                )}
              </div>
              <p className="mt-3 text-[11px] text-[var(--text-muted)] leading-relaxed max-w-3xl">{tt.lcaNote}</p>
            </div>
          )}
        </div>

        {/* Scope / Transparency + estimation precision + fairness — professional, always visible */}
        {simulatedData && (
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ScopeDisclaimerBanner
              scopeNote={simulatedData.scope_note}
              sourceCitation={simulatedData.source_citation}
              unmappedTrafficFraction={data?.totals?.unmapped_traffic_fraction}
              unmappedSlugs={data?.totals?.unmapped_slugs}
              lang={lang}
            />
            <PrecisionBanner precision={data?.totals?.precision} lang={lang} />
            <FairnessNote fairness={data?.totals?.fairness} lang={lang} />
          </div>
        )}

        {sample && (
          <div className="my-4 p-3 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)] text-sm">
            {tt.sampleWarning}
          </div>
        )}

        {loading && renderSkeleton()}

        {error && (
          <div className="my-6 p-4 border border-red-900/50 bg-red-950/20 text-red-300 rounded-xl text-sm">
            {tt.errLoad} {error}. {tt.errEnsure}
          </div>
        )}

        {simulatedData && !loading && (
          <main className="space-y-8">
            {/* SCENARIO LAB - the storytelling centerpiece */}
            <WhatIfSimulator
              greenShiftPercent={greenShiftPercent}
              setGreenShiftPercent={setGreenShiftPercent}
              originalCo2={baselineCo2}
              simulatedCo2={totals?.co2_kg}
              accountingMethod={accountingMethod}
              modeledFraction={data?.totals?.modeled_traffic_fraction}
              lang={lang}
            />

            {/* ESG / CSRD Scope-2 dual-reporting export (P7/6r) */}
            <EsgExportPanel data={data} lang={lang} />

            {/* Visual Explorer */}
            <section className="card p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="font-bold">{tt.vizTitle}</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{tt.vizAllNote}</p>
                </div>
                <div className="flex items-center gap-3">
                  <GroupToggle groupBy={groupBy} onChange={setGroupBy} lang={lang} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 min-h-[360px]">
                  <Co2BarChart models={models} groupBy={groupBy} showAll={showAllModels} onToggleShowAll={() => setShowAllModels(!showAllModels)} lang={lang} />
                </div>
                <div className="lg:col-span-2 card p-4 border-[var(--border)]">
                  <div className="text-xs font-bold tracking-widest text-[var(--text-secondary)] mb-1.5">{tt.vizOriginBreakdown}</div>
                  <OriginDonut models={models} />
                </div>
              </div>
            </section>

            {/* Table Directory - full interactive */}
            <section className="card p-6">
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <h2 className="font-bold">{tt.tableTitle}</h2>
                  <p className="text-xs text-[var(--text-muted)]">{tt.tableSubtitle}</p>
                </div>
                <div className="text-[11px] text-[var(--accent)]/80 font-medium">{isScenario ? tt.scenarioActive : tt.baselineActive}</div>
              </div>

              <ModelsTable 
                models={models} 
                lang={lang} 
                onInspect={setInspectModel}
                isScenarioActive={isScenario}
              />
            </section>

            {/* Trends */}
            <HistoryViewer lang={lang} />

            {/* For researchers & ESG reporting — slim thesis / CSRD block */}
            {data && (
              <section className="card p-6 sm:p-7 bg-gradient-to-br from-[#0c0a07] to-[#080704] border-[var(--accent-border)]">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                  <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--accent-bg)] text-[var(--accent)] text-[11px] font-bold uppercase tracking-wider mb-3 border border-[var(--accent-border)]">
                      <Zap size={13} /> {tt.thesisBadge}
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text)] mb-1.5">{tt.thesisTitle}</h2>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{tt.thesisSubtitle}</p>
                  </div>
                  <div className="flex flex-wrap gap-2.5 shrink-0">
                    <button
                      onClick={() => { navigator.clipboard.writeText(tt.citeApa(data.data_date)).then(() => alert(tt.citeCopied)); }}
                      className="btn btn-secondary text-xs px-4 py-2.5 font-bold"
                    >
                      {tt.thesisCopyCitation}
                    </button>
                    <a href={`${import.meta.env.BASE_URL}data/latest.json`} target="_blank" rel="noreferrer" className="btn btn-ghost border-[var(--border)] text-xs px-4 py-2.5 font-bold">
                      {tt.rawJson}
                    </a>
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-white/5 text-xs text-[var(--text-secondary)] leading-relaxed space-y-2">
                  <p><strong className="text-[var(--accent)]">{tt.csrdPrefix}</strong>{tt.csrdExample}</p>
                  <p className="text-[var(--text-muted)] italic">{tt.thesisScopeNote}</p>
                </div>
              </section>
            )}

            {/* Footer actions + full transparency */}
            <footer className="pt-8 mt-4 border-t border-[var(--border)] text-xs text-[var(--text-muted)] flex flex-col md:flex-row md:items-center gap-x-6 gap-y-2 justify-between">
              <div className="max-w-md">
                {tt.footerStatic}<br/>
                <span className="opacity-60">{tt.footerCopyright}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <a href="https://linkedin.com/in/wyl2607" target="_blank" rel="noreferrer" className="hover:text-[var(--text)] transition-colors">{tt.linkedin}</a>
                <a href="https://github.com/wyl2607/llm-carbon-index" target="_blank" rel="noreferrer" className="hover:text-[var(--text)] transition-colors">{tt.github}</a>
                <a href="https://github.com/wyl2607/llm-carbon-index/blob/main/CHANGELOG.md" target="_blank" rel="noreferrer" className="hover:text-[var(--text)] transition-colors">{tt.changelog}</a>
                <a href={`${import.meta.env.BASE_URL}data/latest.json`} className="hover:text-[var(--text)] underline-offset-2 hover:underline" target="_blank" rel="noreferrer">{tt.rawJson}</a>
                <a href="https://github.com/wyl2607/llm-carbon-index/blob/main/docs/methodology.md" target="_blank" rel="noreferrer" className="hover:text-[var(--text)] underline-offset-2 hover:underline">{tt.methodologyFull}</a>
                {sensData && sensData.drivers && (
                  <span className="text-[var(--accent)]/70">
                    {tt.sensitivityLabel} {tt.sensitivityDetail(sensData.dominant, Math.round(Math.max(...sensData.drivers.map(d => d.total_co2_swing_pct.high))))}
                  </span>
                )}
              </div>
            </footer>
          </main>
        )}
      </div>

      <ModelDetailModal model={inspectModel} onClose={() => setInspectModel(null)} lang={lang} />
    </div>
  );
}

export default App;
