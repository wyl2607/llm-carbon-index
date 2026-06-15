import { useEffect, useState, useMemo } from 'react';
import type { LatestData, Model } from './types';
import type { Lang } from './lib/i18n';
import { useI18n } from './lib/i18n';
import { ScopeDisclaimerBanner } from './components/ScopeDisclaimerBanner';
import { GroupToggle, type GroupBy } from './components/GroupToggle';
import { Co2BarChart } from './components/Co2BarChart';
import { ModelsTable } from './components/ModelsTable';
import { KpiCards } from './components/KpiCards';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { AccountingToggle, type AccountingMethod } from './components/AccountingToggle';
import { HistoryViewer } from './components/HistoryViewer';
import { OriginDonut } from './components/OriginDonut';
import { ModelDetailModal } from './components/ModelDetailModal';

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
    const shiftRatio = greenShiftPercent / 100;
    const targetIntensity = 50;

    const simulatedModels = data.models.map(m => {
      const baseCo2 = (useMarket && m.co2_kg_market) ? m.co2_kg_market : m.co2_kg;
      if (greenShiftPercent === 0) return { ...m, co2_kg: baseCo2 };

      const simulateRange = (val: number) => {
        if (useMarket && m.renewable_match_pct === 100) return 0;
        const orig = val * m.pue * m.carbon_intensity_gco2_kwh / 1000;
        const shifted = val * m.pue * targetIntensity / 1000;
        return orig * (1 - shiftRatio) + shifted * shiftRatio;
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
    <div className="min-h-screen bg-[#0a0c0a] text-[#e4e7e4] selection:bg-emerald-800/40">
      {/* Sticky premium header */}
      <header className="sticky top-0 z-50 border-b border-[#242924] bg-[#0a0c0a]/95 backdrop-blur">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="font-black tracking-[-0.5px] text-lg">LLM Carbon Index</div>
            <div className="text-[10px] px-2 py-px rounded bg-emerald-950 text-emerald-400 border border-emerald-900 font-bold tracking-widest">ALPHA</div>
            {data && <div className="hidden sm:block text-[#717771] text-xs font-mono pl-1">v{data.methodology_version} • {data.data_date}</div>}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Lang switch - bilingual professional */}
            <div className="inline-flex rounded-lg overflow-hidden border border-[#242924] text-xs">
              <button onClick={() => setLang('en')} className={`px-3 py-1 font-medium transition ${lang === 'en' ? 'bg-emerald-600 text-black' : 'hover:bg-[#161916]'}`}>{tt.langEn}</button>
              <button onClick={() => setLang('zh')} className={`px-3 py-1 font-medium transition ${lang === 'zh' ? 'bg-emerald-600 text-black' : 'hover:bg-[#161916]'}`}>{tt.langZh}</button>
            </div>

            <AccountingToggle method={accountingMethod} onChange={setAccountingMethod} />

            <a href="https://github.com/wyl2607/llm-carbon-index/blob/main/docs/methodology.md" target="_blank" rel="noreferrer" className="btn btn-secondary hidden sm:inline-flex text-xs py-1.5 px-4">{tt.methodology}</a>
            <a href="https://github.com/wyl2607/llm-carbon-index" target="_blank" rel="noreferrer" className="btn btn-secondary text-xs py-1.5 px-4">{tt.github}</a>
          </div>
        </div>
      </header>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-16">
        {/* Compact premium hero with global narrative */}
        <div className="pt-8 pb-4">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <h1 className="font-black tracking-[-1.6px] leading-none">{tt.brand}</h1>
              <p className="mt-1.5 text-lg text-[#a1a6a1] max-w-3xl">{tt.tagline} <span className="text-sm align-super text-[#717771]">/ {tt.taglineZh}</span></p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {data && (
                <div className="font-mono text-xs px-3 py-1 rounded-full border border-[#242924] text-[#a1a6a1]">
                  {tt.lastUpdated}: <span className="text-[#e4e7e4]">{data.data_date}</span>
                </div>
              )}
              <button onClick={() => {
                const url = window.location.href;
                navigator.clipboard.writeText(url);
              }} className="btn btn-ghost text-xs border border-[#242924]">{tt.share}</button>
            </div>
          </div>

          {/* Global narrative strip (Total + Baseline + Max Avoided) */}
          {data && totals && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="card p-3">
                <div className="text-[#717771] text-xs">Total Modeled Today</div>
                <div className="font-mono text-2xl font-bold text-white tabular-nums">{(data.totals.total_tokens / 1e12).toFixed(1)} T tokens</div>
              </div>
              <div className="card p-3">
                <div className="text-[#717771] text-xs">Baseline CO₂ (mid)</div>
                <div className="font-mono text-2xl font-bold text-white tabular-nums">{Math.round(data.totals.co2_kg.mid / 1000)} t</div>
              </div>
              <div className="card p-3 border-emerald-900/40">
                <div className="text-emerald-400 text-xs">Max Green Avoided (100% shift)</div>
                <div className="font-mono text-2xl font-bold text-emerald-400 tabular-nums">−{Math.round(data.totals.co2_kg.mid * 0.85 / 1000)} t</div>
                <div className="text-[10px] text-emerald-300/70">~85% mitigation on current slice (target 50 gCO₂/kWh)</div>
              </div>
            </div>
          )}
        </div>

        {/* For Thesis & ESG Reports / German job market (critical deliverable) */}
        {simulatedData && (
          <div className="card p-5 mb-6 bg-[#0c100c] border border-emerald-900/30">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="font-semibold text-emerald-400">{tt.thesisTitle}</div>
                <div className="text-sm text-[#a1a6a1] mt-0.5">{tt.thesisSubtitle}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => {
                    if (!data) return;
                    const citation = `Wyl (2026). LLM Carbon Index — OpenRouter-visible LLM inference CO₂ estimates with uncertainty ranges (data date ${data.data_date}). https://wyl2607.github.io/llm-carbon-index/. Methodology v${data.methodology_version}.`;
                    navigator.clipboard.writeText(citation).then(() => alert(tt.thesisCopyCitation + ' (APA-style)'));
                  }}
                  className="btn btn-secondary text-xs"
                >
                  {tt.thesisCopyCitation}
                </button>
                <a 
                  href="https://github.com/wyl2607/llm-carbon-index/blob/main/docs/methodology.md" 
                  target="_blank" 
                  className="btn btn-ghost text-xs border border-[#242924]"
                >
                  {tt.thesisMethodology}
                </a>
              </div>
            </div>
            <div className="mt-3 text-xs text-[#a1a6a1] border-t border-[#242924] pt-3 space-y-2">
              <div>{tt.thesisScopeNote} <span className="text-emerald-400/70">{tt.deEuHint}</span></div>
              <div className="font-mono text-[10px] bg-[#0a0c0a] p-2 rounded border border-[#242924]">
                <strong>BibTeX:</strong> {data && tt.citeBibtex(data.data_date, data.methodology_version)}<br/><br/>
                <strong>APA:</strong> {data && tt.citeApa(data.data_date)}
              </div>
              <div className="text-emerald-300/80">{tt.csrdExample}</div>
              <div className="text-emerald-300/80">{tt.euTaxonomy}</div>
            </div>
          </div>
        )}

        {/* Scope / Transparency - professional, always visible */}
        {simulatedData && (
          <ScopeDisclaimerBanner scopeNote={simulatedData.scope_note} sourceCitation={simulatedData.source_citation} />
        )}

        {sample && (
          <div className="my-4 p-3 rounded-xl border border-amber-900/40 bg-amber-950/20 text-amber-300 text-sm">
            {tt.sampleWarning}
          </div>
        )}

        {loading && renderSkeleton()}

        {error && (
          <div className="my-6 p-4 border border-red-900/50 bg-red-950/20 text-red-300 rounded-xl text-sm">
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

            {/* KPIs — scenario aware */}
            {totals && (
              <KpiCards 
                totals={totals} 
                baselineCo2={baselineCo2} 
                shift={greenShiftPercent} 
                lang={lang} 
              />
            )}

            {/* Visual Explorer */}
            <section className="card p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="font-bold">{tt.vizTitle}</h2>
                  <p className="text-xs text-[#717771] mt-0.5">{tt.vizAllNote}</p>
                </div>
                <div className="flex items-center gap-3">
                  <GroupToggle groupBy={groupBy} onChange={setGroupBy} />
                  <select 
                    value="15" 
                    onChange={() => { /* top-N could be wired if desired; current chart shows all */ }} 
                    className="text-xs py-1 px-2 bg-[#0a0c0a] border border-[#242924] rounded-lg"
                  >
                    <option>Top emitters + others</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 min-h-[360px]">
                  <Co2BarChart models={models} groupBy={groupBy} showAll={showAllModels} onToggleShowAll={() => setShowAllModels(!showAllModels)} />
                </div>
                <div className="lg:col-span-2 card p-4 border-[#242924]">
                  <div className="text-xs font-bold tracking-widest text-[#a1a6a1] mb-1.5">{tt.vizOriginBreakdown}</div>
                  <OriginDonut models={models} />
                </div>
              </div>
            </section>

            {/* Table Directory - full interactive */}
            <section className="card p-6">
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <h2 className="font-bold">{tt.tableTitle}</h2>
                  <p className="text-xs text-[#717771]">{tt.tableSubtitle}</p>
                </div>
                <div className="text-[11px] text-emerald-400/80 font-medium">{isScenario ? 'SCENARIO VALUES ACTIVE' : 'BASELINE VALUES'}</div>
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

            {/* Footer actions + full transparency */}
            <footer className="pt-8 mt-4 border-t border-[#242924] text-xs text-[#717771] flex flex-col md:flex-row md:items-center gap-x-6 gap-y-2 justify-between">
              <div>{tt.footerStatic}</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <a href={`${import.meta.env.BASE_URL}data/latest.json`} className="hover:text-[#e4e7e4] underline-offset-2 hover:underline" target="_blank" rel="noreferrer">{tt.rawJson}</a>
                <a href="https://github.com/wyl2607/llm-carbon-index/blob/main/docs/methodology.md" target="_blank" rel="noreferrer" className="hover:text-[#e4e7e4] underline-offset-2 hover:underline">{tt.methodologyFull}</a>
                <button 
                  onClick={() => {
                    if (!data) return;
                    const apa = tt.citeApa ? tt.citeApa(data.data_date) : '';
                    const bib = tt.citeBibtex ? tt.citeBibtex(data.data_date, data.methodology_version) : '';
                    const text = `${apa}\n\n${bib}`;
                    navigator.clipboard.writeText(text).then(() => alert(tt.citeCopied + ' (APA + BibTeX ready for thesis)'));
                  }}
                  className="hover:text-[#e4e7e4] underline-offset-2 hover:underline"
                >
                  {tt.cite}
                </button>
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
