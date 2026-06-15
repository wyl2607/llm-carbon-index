import { useEffect, useState, useMemo } from 'react';
import type { LatestData, Model } from './types';
import { ScopeDisclaimerBanner } from './components/ScopeDisclaimerBanner';
import { GroupToggle, type GroupBy } from './components/GroupToggle';
import { Co2BarChart } from './components/Co2BarChart';
import { ModelsTable } from './components/ModelsTable';
import { KpiCards } from './components/KpiCards';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { AccountingToggle, type AccountingMethod } from './components/AccountingToggle';
import { HistoryViewer } from './components/HistoryViewer';

const isSampleData = (models: Model[]) =>
  models.length > 0 && models[0].slug.startsWith('example/');

function App() {
  const [data, setData] = useState<LatestData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('open_or_closed');
  const [loading, setLoading] = useState(true);
  const [greenShiftPercent, setGreenShiftPercent] = useState<number>(0);
  const [accountingMethod, setAccountingMethod] = useState<AccountingMethod>('location');

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
      .catch((e: any) => {
        if (!cancelled) setError(String(e?.message || e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute simulated data based on green grid shifting
  const simulatedData = useMemo(() => {
    if (!data) return null;
    
    const useMarket = accountingMethod === 'market';
    const shiftRatio = greenShiftPercent / 100;
    const targetIntensity = 50; 
    
    const simulatedModels = data.models.map(m => {
      const baseCo2 = (useMarket && m.co2_kg_market) ? m.co2_kg_market : m.co2_kg;
      
      if (greenShiftPercent === 0) {
        return { ...m, co2_kg: baseCo2 };
      }
      
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
    
    // Re-calculate totals based on simulated models
    const totalCo2 = simulatedModels.reduce(
      (acc, m) => ({
        low: acc.low + m.co2_kg.low,
        mid: acc.mid + m.co2_kg.mid,
        high: acc.high + m.co2_kg.high,
      }),
      { low: 0, mid: 0, high: 0 }
    );
    
    return {
      ...data,
      models: simulatedModels,
      totals: {
        ...data.totals,
        co2_kg: totalCo2
      }
    };
  }, [data, greenShiftPercent, accountingMethod]);

  const models: Model[] = simulatedData?.models ?? [];
  const totals = simulatedData?.totals;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 selection:bg-emerald-200 dark:selection:bg-emerald-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <header className="mb-12 border-b border-slate-200 dark:border-slate-800 pb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">
                  Alpha v1.0
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Methodology v{data ? data.methodology_version : '—'} • Data Date: {data ? data.data_date : '—'}
                </div>
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white mb-4 leading-tight">
                LLM Carbon Index
              </h1>
              <div className="space-y-2">
                <p className="text-2xl text-slate-600 dark:text-slate-300 font-semibold leading-snug">
                  Transparent CO₂ estimation for the AI era.
                </p>
                <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                  Tracking the environmental footprint of OpenRouter LLM inference with end-to-end uncertainty ranges. 
                  <span className="block mt-1 opacity-75 font-normal">
                    追踪 OpenRouter 大模型推理的碳足迹，提供端到端的不确定性估算范围。
                  </span>
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 pb-1">
              <a 
                href="https://github.com/wyl2607/llm-carbon-index/blob/main/docs/methodology.md" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Methodology & Docs
              </a>
              <a 
                href="https://github.com/wyl2607/llm-carbon-index" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                GitHub
              </a>
            </div>
            
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 bg-white/50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Accounting Method:</span>
              <AccountingToggle method={accountingMethod} onChange={setAccountingMethod} />
            </div>
          </div>
        </header>

        {loading && (
          <div className="py-12 text-center animate-pulse text-slate-500">
            <div className="w-8 h-8 mx-auto mb-4 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            Loading data...
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-4 rounded-lg border border-red-200 dark:border-red-800 mb-8">
            <strong className="font-semibold">Error loading /data/latest.json:</strong> {error}. Run the copy-data script or build first.
          </div>
        )}

        {simulatedData && (
          <main>
            <ScopeDisclaimerBanner
              scopeNote={simulatedData.scope_note}
              sourceCitation={simulatedData.source_citation}
            />

            {isSampleData(models) && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 mb-8 rounded-r-lg shadow-sm">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400 dark:text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      <strong className="font-semibold">SAMPLE DATA:</strong> Using placeholder data from tests/fixtures. Real data will replace it once the Phase 3 pipeline runs. All numbers are illustrative.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <WhatIfSimulator 
              greenShiftPercent={greenShiftPercent}
              setGreenShiftPercent={setGreenShiftPercent}
              originalCo2={accountingMethod === 'market' && data?.totals?.co2_kg_market ? data.totals.co2_kg_market : data?.totals?.co2_kg}
              simulatedCo2={totals?.co2_kg}
              accountingMethod={accountingMethod}
            />

            {totals && <KpiCards totals={totals} />}

            <div className="my-10 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">CO₂ Footprint by Model</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Estimates with uncertainty ranges (mid + range)</p>
                </div>
                <GroupToggle groupBy={groupBy} onChange={setGroupBy} />
              </div>
              
              <div className="h-[400px] w-full">
                {models.length > 0 ? (
                  <Co2BarChart models={models} groupBy={groupBy} />
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic">No models data available.</div>
                )}
              </div>
            </div>

            <HistoryViewer />

            <div className="my-10 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 overflow-hidden">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Emissions Directory</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Detailed breakdown of modeled OpenRouter traffic</p>
              </div>
              
              {models.length > 0 ? (
                <ModelsTable models={models} />
              ) : (
                <div className="py-8 text-center text-slate-400 italic">No models data available.</div>
              )}
            </div>
          </main>
        )}

        <footer className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p>Static build. Ranges are carried end-to-end (low/mid/high).</p>
          </div>
          <div className="flex gap-4">
            <a href="https://github.com/wyl2607/llm-carbon-index" target="_blank" rel="noreferrer" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">GitHub</a>
            <a href="https://github.com/wyl2607/llm-carbon-index/blob/main/docs/methodology.md" target="_blank" rel="noreferrer" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Methodology</a>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
