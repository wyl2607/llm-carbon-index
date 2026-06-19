import { useEffect, useState, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import type { LatestData, Model, SensitivityData } from './types';
import type { Lang } from './lib/i18n';
import { useI18n } from './lib/i18n';
import { Nav } from './components/Nav';
import { AccountingToggle, type AccountingMethod } from './components/AccountingToggle';
import { ModelDetailModal } from './components/ModelDetailModal';
import { shiftedCo2Kg } from './lib/scenario';
import { setDisplayLocale } from './lib/format';
import type { PageContext } from './lib/outletContext';

const isSampleData = (models: Model[]) =>
  models.length > 0 && models[0].slug.startsWith('example/');

/**
 * Layout shell: fetches the committed JSON once, owns the global controls
 * (language, Scope-2 accounting, green-shift scenario) and renders the sticky
 * header + nav + the active page (via <Outlet>). Page state flows down through
 * the router Outlet context (see lib/outletContext.ts) so the data is fetched
 * a single time and shared across all routes.
 */
function Layout() {
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
    ]).then(([latestJson, , sensJson]) => {
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
  // Numbers follow the selected language's locale; set before children render.
  setDisplayLocale(lang);

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

  const ctx: PageContext | null = (data && simulatedData) ? {
    data, sensData, simulatedData, models, totals, baselineCo2,
    lang, accountingMethod, greenShiftPercent, setGreenShiftPercent,
    isScenario, sample, setInspectModel,
  } : null;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] selection:bg-[var(--accent-bg)]">
      <a href="#main-content" className="skip-link">{tt.skipToContent ?? 'Skip to content'}</a>
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 min-h-14 py-2.5 sm:py-0 sm:h-14 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm">
          <div className="flex items-center gap-3 shrink-0">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--accent)] text-white shrink-0">
              <Leaf className="w-[18px] h-[18px]" strokeWidth={2.1} />
            </span>
            <div className="font-black tracking-[-0.5px] text-lg">LLM Carbon Index</div>
            {data && <div className="text-[10px] px-2 py-px rounded bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent-border)] font-bold tracking-widest">v{data.methodology_version}</div>}
          </div>

          <Nav lang={lang} />

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
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

            <a href="https://github.com/wyl2607/llm-carbon-index" target="_blank" rel="noreferrer" className="btn btn-secondary text-xs py-1.5 px-4">{tt.github}</a>
          </div>
        </div>
      </header>

      <div id="main-content" className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-16">
        {loading && renderSkeleton()}

        {error && (
          <div className="my-6 p-4 border border-red-200 bg-red-50 text-red-700 rounded-xl text-sm">
            {tt.errLoad} {error}. {tt.errEnsure}
          </div>
        )}

        {ctx && !loading && <Outlet context={ctx} />}
      </div>

      <ModelDetailModal model={inspectModel} onClose={() => setInspectModel(null)} lang={lang} />
    </div>
  );
}

export default Layout;
