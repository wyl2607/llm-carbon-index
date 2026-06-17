import { ScopeDisclaimerBanner } from '../components/ScopeDisclaimerBanner';
import { PrecisionBanner } from '../components/PrecisionBanner';
import { FairnessNote } from '../components/FairnessNote';
import { GroupToggle, type GroupBy } from '../components/GroupToggle';
import { Co2BarChart } from '../components/Co2BarChart';
import { ModelsTable } from '../components/ModelsTable';
import { KpiCards } from '../components/KpiCards';
import { WhatIfSimulator } from '../components/WhatIfSimulator';
import { EsgExportPanel } from '../components/EsgExportPanel';
import { HistoryViewer } from '../components/HistoryViewer';
import { OriginDonut } from '../components/OriginDonut';
import { formatCO2Range, formatWaterRange } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { usePageData } from '../lib/outletContext';
import { useState } from 'react';
import { Zap } from 'lucide-react';

/**
 * Overview / Home — the original single-page dashboard body, relocated verbatim
 * out of App.tsx. Shared state (data, lang, scenario, accounting) now arrives
 * through the router Outlet context rather than local state.
 */
export default function Overview() {
  const {
    data, sensData, simulatedData, models, totals, baselineCo2,
    lang, accountingMethod, greenShiftPercent, setGreenShiftPercent,
    isScenario, sample, setInspectModel,
  } = usePageData();
  const tt = useI18n(lang);

  const [groupBy, setGroupBy] = useState<GroupBy>('open_or_closed');
  const [showAllModels, setShowAllModels] = useState(false);
  // Page-load timestamp for the staleness indicator — captured once so render stays pure.
  const [nowMs] = useState(() => Date.now());

  return (
    <>
      {/* Hero Area: Large Title + KPI Cards (Immediate Context) */}
      <div className="pt-10 pb-8 sm:pt-16 sm:pb-12">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-sm text-[var(--text-muted)] font-mono">
                {tt.methodologyVersion}{data.methodology_version} • {data.data_date}
              </div>
              {/* L1 UI staleness indicator (phase 6L). Driven by JSON data_date. N=7 days. */}
              {data.data_date && (() => {
                const d = new Date(data.data_date + 'T00:00:00Z');
                const ageDays = isNaN(d.getTime()) ? 0 : Math.floor((nowMs - d.getTime()) / 86400000);
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
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-[-0.03em] text-[var(--text)] mb-6 leading-[0.95]">
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
            modeledFraction={data.totals?.modeled_traffic_fraction}
          />
        )}

        {/* v0.2 lifecycle + water strip — operational vs embodied vs total + water */}
        {totals?.co2_kg_total && totals?.co2_kg_embodied && (
          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5">
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--accent)] mb-3">{tt.lcaTitle}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-0.5">{tt.lcaOperational}</div>
                <div className="font-mono text-[var(--text)]">{formatCO2Range(totals.co2_kg)}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-0.5">{tt.lcaEmbodied}</div>
                <div className="font-mono text-[var(--text-secondary)]">{formatCO2Range(totals.co2_kg_embodied)}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--accent)] mb-0.5">{tt.lcaTotal}</div>
                <div className="font-mono text-[var(--accent)] font-semibold">{formatCO2Range(totals.co2_kg_total)}</div>
              </div>
              {totals.water_liters && (
                <div>
                  <div className="text-xs text-[var(--text-muted)] mb-0.5">{tt.lcaWater}</div>
                  <div className="font-mono text-[var(--accent)]">{formatWaterRange(totals.water_liters)}</div>
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)] leading-relaxed max-w-3xl">{tt.lcaNote}</p>
          </div>
        )}
      </div>

      {/* Scope / Transparency + estimation precision + fairness — professional, always visible */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ScopeDisclaimerBanner
          sourceCitation={simulatedData.source_citation}
          unmappedTrafficFraction={data.totals?.unmapped_traffic_fraction}
          unmappedSlugs={data.totals?.unmapped_slugs}
          lang={lang}
        />
        <PrecisionBanner precision={data.totals?.precision} lang={lang} />
        <FairnessNote fairness={data.totals?.fairness} lang={lang} />
      </div>

      {sample && (
        <div className="my-4 p-3 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)] text-sm">
          {tt.sampleWarning}
        </div>
      )}

      <main className="space-y-8">
        {/* SCENARIO LAB - the storytelling centerpiece */}
        <WhatIfSimulator
          greenShiftPercent={greenShiftPercent}
          setGreenShiftPercent={setGreenShiftPercent}
          originalCo2={baselineCo2}
          simulatedCo2={totals?.co2_kg}
          accountingMethod={accountingMethod}
          modeledFraction={data.totals?.modeled_traffic_fraction}
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
            <div className="text-xs text-[var(--accent)] font-semibold">{isScenario ? tt.scenarioActive : tt.baselineActive}</div>
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
        <section className="card p-6 sm:p-7 bg-[var(--bg-elev)] border-[var(--accent-border)]">
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
          <div className="mt-5 pt-4 border-t border-[var(--border)] text-xs text-[var(--text-secondary)] leading-relaxed space-y-2">
            <p><strong className="text-[var(--accent)]">{tt.csrdPrefix}</strong>{tt.csrdExample}</p>
            <p className="text-[var(--text-muted)] italic">{tt.thesisScopeNote}</p>
          </div>
        </section>

        {/* Footer actions + full transparency */}
        <footer className="pt-8 mt-4 border-t border-[var(--border)] text-xs text-[var(--text-muted)] flex flex-col md:flex-row md:items-center gap-x-6 gap-y-2 justify-between">
          <div className="max-w-md">
            {tt.footerStatic}<br />
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
    </>
  );
}
