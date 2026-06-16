import { useEffect, useState, useMemo } from 'react';
import type { LatestData, Model } from './types';
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Core interactive state
  const [lang, setLang] = useState<Lang>(() => {
    const l = new URLSearchParams(window.location.search).get('lang');
    return (l === 'en' || l === 'zh') ? l : 'en';
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

  // Table filters are managed inside ModelsTable for simplicity. Global simulator remains full dataset.

  const [inspectModel, setInspectModel] = useState<Model | null>(null);

  // Persist key state to URL (debounced-ish via effect)
  useEffect(() => {
    const p = new URLSearchParams();
    if (greenShiftPercent > 0) p.set('shift', String(greenShiftPercent));
    if (accountingMethod !== 'location') p.set('acc', accountingMethod);
    if (lang !== 'en') p.set('lang', lang);
    const qs = p.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, [greenShiftPercent, accountingMethod, lang]);

  // Data load (static)
  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/latest.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load data: ${r.status}`);
        return r.json();
      })
      .then((json: LatestData) => {
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const tt = useI18n(lang);

  // Compute simulated (scenario) data - drives KPIs + main charts
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

  // Loading skeleton
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
    <div className="min-h-screen bg-bg-card text-text selection:bg-accent-bg">
      {/* Sticky premium header */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg-card/95 backdrop-blur">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="font-black tracking-[-0.5px] text-lg">LLM Carbon Index</div>
            <div className="text-[10px] px-2 py-px rounded bg-accent-bg text-accent border border-accent-border font-bold tracking-widest">VERSION 1.0</div>
            {data && <div className="hidden sm:block text-text text-xs font-mono pl-1">v{data.methodology_version} • {data.data_date}</div>}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Lang switch - bilingual professional */}
            <div className="inline-flex  overflow-hidden border border-border text-xs">
              <button onClick={() => setLang('en')} className={`px-3 py-1 font-medium transition ${lang === 'en' ? 'bg-accent-bg text-black' : 'hover:bg-bg-card'}`}>{tt.langEn}</button>
              <button onClick={() => setLang('zh')} className={`px-3 py-1 font-medium transition ${lang === 'zh' ? 'bg-accent-bg text-black' : 'hover:bg-bg-card'}`}>{tt.langZh}</button>
            </div>

            <AccountingToggle method={accountingMethod} onChange={setAccountingMethod} />

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
                <div className="text-sm text-text font-mono">
                  Methodology v{data ? data.methodology_version : '—'} • {data ? data.data_date : '—'}
                </div>
              </div>
              <h1 className="text-6xl sm:text-8xl font-black tracking-[-3px] text-white mb-6 leading-[0.9]">
                LLM Carbon Index
              </h1>
              <div className="space-y-4">
                <p className="text-2xl sm:text-3xl text-accent font-bold tracking-tight leading-tight">
                  Transparent CO₂ estimation for the AI era.
                </p>
                <p className="text-lg text-text leading-relaxed max-w-2xl font-medium">
                  Tracking the environmental footprint of OpenRouter LLM inference with end-to-end uncertainty ranges. 
                  <span className="block mt-2 opacity-60 font-normal italic">
                    追踪 OpenRouter 大模型推理的碳足迹，提供端到端的不确定性估算范围。
                  </span>
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 lg:pb-2">
              <a 
                href="https://github.com/wyl2607/llm-carbon-index/blob/main/docs/methodology.md" 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-primary px-8 py-4 text-base "
              >
                Methodology & Docs
              </a>
              <button 
                onClick={() => {
                  const url = window.location.href;
                  navigator.clipboard.writeText(url).then(() => alert(tt.citeCopied));
                }}
                className="btn btn-secondary px-8 py-4 text-base"
              >
                Share Scenario
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
            <div className="mt-5  border border-border bg-black/30 p-5">
              <div className="text-[11px] font-bold uppercase tracking-widest text-accent mb-3">{tt.lcaTitle}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-[11px] text-text mb-0.5">{tt.lcaOperational}</div>
                  <div className="font-mono text-text">{formatCO2Range(totals.co2_kg)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-text mb-0.5">{tt.lcaEmbodied}</div>
                  <div className="font-mono text-text">{formatCO2Range(totals.co2_kg_embodied)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-accent mb-0.5">{tt.lcaTotal}</div>
                  <div className="font-mono text-accent font-semibold">{formatCO2Range(totals.co2_kg_total)}</div>
                </div>
                {totals.water_liters && (
                  <div>
                    <div className="text-[11px] text-text-muted mb-0.5">{tt.lcaWater}</div>
                    <div className="font-mono text-text-muted">{formatWaterRange(totals.water_liters)}</div>
                  </div>
                )}
              </div>
              <p className="mt-3 text-[11px] text-text leading-relaxed max-w-3xl">{tt.lcaNote}</p>
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
          <div className="my-4 p-3  border border-warning-border bg-warning-bg text-warning text-sm">
            {tt.sampleWarning}
          </div>
        )}

        {loading && renderSkeleton()}

        {error && (
          <div className="my-6 p-4 border border-warning-border bg-warning-bg text-warning  text-sm">
            Error loading data: {error}. Ensure copy-data ran and public/data/latest.json exists.
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

            {/* Visual Explorer */}
            <section className="card p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="font-bold">{tt.vizTitle}</h2>
                  <p className="text-xs text-text mt-0.5">{tt.vizAllNote}</p>
                </div>
                <div className="flex items-center gap-3">
                  <GroupToggle groupBy={groupBy} onChange={setGroupBy} />
                  <select 
                    value="15" 
                    onChange={() => { /* top-N wired if desired */ }} 
                    className="text-xs py-1 px-2 bg-bg-card border border-border "
                  >
                    <option>Top emitters + others</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 min-h-[360px]">
                  <Co2BarChart models={models} groupBy={groupBy} showAll={showAllModels} onToggleShowAll={() => setShowAllModels(!showAllModels)} />
                </div>
                <div className="lg:col-span-2 card p-4 border-border">
                  <div className="text-xs font-bold tracking-widest text-text mb-1.5">{tt.vizOriginBreakdown}</div>
                  <OriginDonut models={models} />
                </div>
              </div>
            </section>

            {/* Table Directory - full interactive */}
            <section className="card p-6">
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <h2 className="font-bold">{tt.tableTitle}</h2>
                  <p className="text-xs text-text">{tt.tableSubtitle}</p>
                </div>
                <div className="text-[11px] text-accent font-medium">{isScenario ? 'SCENARIO VALUES ACTIVE' : 'BASELINE VALUES'}</div>
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
              <section className="card p-6 sm:p-7    border-accent-border">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                  <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1  bg-accent-bg text-accent text-[11px] font-bold uppercase tracking-wider mb-3 border border-accent-border">
                      <Zap size={13} /> {tt.thesisBadge}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1.5">{tt.thesisTitle}</h2>
                    <p className="text-sm text-text leading-relaxed">{tt.thesisSubtitle}</p>
                  </div>
                  <div className="flex flex-wrap gap-2.5 shrink-0">
                    <button
                      onClick={() => { navigator.clipboard.writeText(tt.citeApa(data.data_date)).then(() => alert(tt.citeCopied)); }}
                      className="btn btn-secondary text-xs px-4 py-2.5 font-bold"
                    >
                      {tt.thesisCopyCitation}
                    </button>
                    <a href={`${import.meta.env.BASE_URL}data/latest.json`} target="_blank" rel="noreferrer" className="btn btn-ghost border-border text-xs px-4 py-2.5 font-bold">
                      {tt.rawJson}
                    </a>
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-white/5 text-xs text-text leading-relaxed space-y-2">
                  <p><strong className="text-accent">CSRD / ESRS E1 — </strong>{tt.csrdExample}</p>
                  <p className="text-text italic">{tt.thesisScopeNote}</p>
                </div>
              </section>
            )}

            {/* Footer actions + full transparency */}
            <footer className="pt-8 mt-4 border-t border-border text-xs text-text flex flex-col md:flex-row md:items-center gap-x-6 gap-y-2 justify-between">
              <div className="max-w-md">
                {tt.footerStatic}<br/>
                <span className="opacity-60">Estimates only. Not global measurement. (c) 2026 Wyl.</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <a href="https://linkedin.com/in/wyl2607" target="_blank" rel="noreferrer" className="hover:text-text transition-colors">LinkedIn</a>
                <a href="https://github.com/wyl2607/llm-carbon-index" target="_blank" rel="noreferrer" className="hover:text-text transition-colors">GitHub</a>
                <a href="https://github.com/wyl2607/llm-carbon-index/blob/main/CHANGELOG.md" target="_blank" rel="noreferrer" className="hover:text-text transition-colors">CHANGELOG</a>
                <a href={`${import.meta.env.BASE_URL}data/latest.json`} className="hover:text-text underline-offset-2 hover:underline" target="_blank" rel="noreferrer">{tt.rawJson}</a>
                <a href="https://github.com/wyl2607/llm-carbon-index/blob/main/docs/methodology.md" target="_blank" rel="noreferrer" className="hover:text-text underline-offset-2 hover:underline">{tt.methodologyFull}</a>
              </div>
            </footer>
          </main>
        )}
      </div>

      <ModelDetailModal model={inspectModel} onClose={() => setInspectModel(null)} />
    </div>
  );
}

export default App;
