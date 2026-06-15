import { useEffect, useState } from 'react';
import type { LatestData, Model } from './types';
import { ScopeDisclaimerBanner } from './components/ScopeDisclaimerBanner';
import { GroupToggle, type GroupBy } from './components/GroupToggle';
import { Co2BarChart } from './components/Co2BarChart';
import { ModelsTable } from './components/ModelsTable';
import { KpiCards } from './components/KpiCards';

const isSampleData = (models: Model[]) =>
  models.length > 0 && models[0].slug.startsWith('example/');

function App() {
  const [data, setData] = useState<LatestData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('open_or_closed');
  const [loading, setLoading] = useState(true);

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

  const models: Model[] = data?.models ?? [];
  const totals = data?.totals;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 selection:bg-emerald-200 dark:selection:bg-emerald-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <header className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
              Alpha
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Methodology v{data ? data.methodology_version : '—'} • Data Date: {data ? data.data_date : '—'}
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
            LLM Carbon Index
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 font-medium">
            Tracking the estimated CO₂ footprint of AI inference. <span className="opacity-80 font-normal">/ 追踪 AI 推理的估算碳足迹。</span>
          </p>
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

        {data && (
          <main>
            <ScopeDisclaimerBanner
              scopeNote={data.scope_note}
              sourceCitation={data.source_citation}
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
