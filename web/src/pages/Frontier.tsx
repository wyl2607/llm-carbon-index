import { useMemo, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { usePageData } from '../lib/outletContext';
import { useI18n } from '../lib/i18n';
import { nf, formatCO2Parts } from '../lib/format';
import { tokens } from '../theme/tokens';
import type { Model, Range } from '../types';
import { TrendingDown, Sparkles } from 'lucide-react';

/** A model that can be placed on the plane (has both axes). */
interface Point {
  slug: string;
  name: string;
  x: number; // capability index
  y: number; // energy intensity Wh/Mtok (mid)
  z: number; // traffic (total_tokens)
  model: Model;
}

const MEASURED_ENERGY = new Set(['ai_energy_score', 'ecologits']);

function intensityMid(m: Model): number | null {
  const v = m.energy_wh_per_mtok?.mid;
  return typeof v === 'number' && v > 0 ? v : null;
}

function toPoint(m: Model): Point | null {
  const y = intensityMid(m);
  if (m.capability_index == null || y == null) return null;
  return { slug: m.slug, name: m.display_name, x: m.capability_index, y, z: m.total_tokens, model: m };
}

function isMeasured(m: Model): boolean {
  return MEASURED_ENERGY.has(String(m.energy_source));
}

export default function Frontier() {
  const { data, lang } = usePageData();
  const tt = useI18n(lang);
  const [includeLowConf, setIncludeLowConf] = useState(false);

  const fleet = data.fleet_rightsizing;

  const { frontierPts, measuredPts, fallbackPts } = useMemo(() => {
    const pts = data.models.map(toPoint).filter((p): p is Point => p !== null);
    const frontier: Point[] = [];
    const measured: Point[] = [];
    const fallback: Point[] = [];
    for (const p of pts) {
      if (p.model.on_frontier) frontier.push(p);
      else if (isMeasured(p.model)) measured.push(p);
      else fallback.push(p);
    }
    // Frontier envelope: connect points left→right (capability ascending).
    frontier.sort((a, b) => a.x - b.x);
    return { frontierPts: frontier, measuredPts: measured, fallbackPts: fallback };
  }, [data.models]);

  // Headline: default excludes low-confidence (fleet_rightsizing as emitted). When the
  // toggle is on, add the low-confidence (fallback-energy) models' avoidable CO₂ and
  // re-derive the percentage against the same operational total.
  const headline = useMemo(() => {
    if (!fleet) return null;
    if (!includeLowConf) {
      return { co2: fleet.avoidable_co2_kg, pct: fleet.avoidable_pct_of_total, included: fleet.models_included };
    }
    const total = data.totals.co2_kg;
    let extraLow = 0, extraMid = 0, extraHigh = 0, n = 0;
    for (const m of data.models) {
      if (m.flags?.includes('LOW_CONFIDENCE_GAP') && m.avoidable_co2_kg) {
        extraLow += m.avoidable_co2_kg.low;
        extraMid += m.avoidable_co2_kg.mid;
        extraHigh += m.avoidable_co2_kg.high;
        n += 1;
      }
    }
    const co2: Range = {
      low: fleet.avoidable_co2_kg.low + extraLow,
      mid: fleet.avoidable_co2_kg.mid + extraMid,
      high: fleet.avoidable_co2_kg.high + extraHigh,
    };
    const pct: Range = {
      low: total.low > 0 ? co2.low / total.low : 0,
      mid: total.mid > 0 ? co2.mid / total.mid : 0,
      high: total.high > 0 ? co2.high / total.high : 0,
    };
    return { co2, pct, included: fleet.models_included + n };
  }, [fleet, includeLowConf, data.models, data.totals]);

  if (!fleet || frontierPts.length + measuredPts.length + fallbackPts.length === 0) {
    return (
      <div className="pt-8 pb-4 space-y-4">
        <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.02em]">{tt.frTitle}</h1>
        <p className="text-[var(--text-secondary)] max-w-3xl">{tt.frIntro}</p>
        <div className="card p-6 text-sm text-[var(--text-muted)]">{tt.frUnavailable}</div>
      </div>
    );
  }

  const pctOf = (r: Range, k: keyof Range) => nf(r[k] * 100, { maximumFractionDigits: 1 });

  return (
    <div className="pt-8 pb-4 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.02em]">{tt.frTitle}</h1>
        <p className="text-[var(--text-secondary)] max-w-3xl">{tt.frIntro}</p>
        <p className="text-xs text-[var(--text-muted)] font-mono">
          {tt.frSnapshotLine(fleet.capability_index_version, fleet.capability_index_accessed)}
        </p>
      </header>

      {/* Headline avoidable-CO₂ card */}
      {headline && (
        <section className="card p-6 bg-[var(--accent-bg)] border-[var(--accent-border)]">
          <div className="flex items-start gap-3">
            <TrendingDown size={20} className="text-[var(--accent)] shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-bold text-[var(--accent)] mb-1">{tt.frHeadline}</h2>
              {headline.pct.mid > 0 ? (
                <>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {tt.frHeadlineBody(pctOf(headline.pct, 'mid'), pctOf(headline.pct, 'low'), pctOf(headline.pct, 'high'))}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-2 font-mono">
                    {formatCO2Parts(headline.co2).mid} {formatCO2Parts(headline.co2).unit}
                    {' · '}{formatCO2Parts(headline.co2).range} {formatCO2Parts(headline.co2).unit}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">{tt.frHeadlineEmpty}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-[var(--text-muted)]">
                <span><b>{headline.included}</b> {tt.frModelsIncluded}</span>
                <span><b>{fleet.models_excluded_low_confidence}</b> {tt.frModelsExcluded}</span>
                <label className="flex items-center gap-1.5 cursor-pointer ml-auto">
                  <input
                    type="checkbox"
                    checked={includeLowConf}
                    onChange={(e) => setIncludeLowConf(e.target.checked)}
                    className="accent-[var(--accent)]"
                  />
                  {tt.frToggleLowConf}
                </label>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Scatter */}
      <section className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-[var(--text-secondary)]" />
          <h2 className="font-bold">{tt.frTitle}</h2>
        </div>
        <div className="w-full" style={{ height: 460 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 24, bottom: 56, left: 12 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="var(--grid-line)" />
              <XAxis
                type="number"
                dataKey="x"
                name={tt.frChartX}
                domain={['dataMin - 2', 'dataMax + 2']}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickLine={{ stroke: 'var(--border)' }}
                axisLine={{ stroke: 'var(--border)' }}
                label={{ value: tt.frChartX, position: 'insideBottom', offset: -42, fontSize: 11, fill: 'var(--text-muted)' }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={tt.frChartY}
                scale="log"
                domain={['auto', 'auto']}
                allowDataOverflow
                tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickLine={{ stroke: 'var(--border)' }}
                axisLine={{ stroke: 'var(--border)' }}
                label={{ value: tt.frChartY, angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--text-muted)' }}
              />
              <ZAxis type="number" dataKey="z" range={[40, 520]} />
              <Tooltip content={<FrontierTooltip tt={tt} />} cursor={{ strokeDasharray: '3 3' }} />
              {includeLowConf && (
                <Scatter name="fallback" data={fallbackPts} fill={tokens.colors.other} fillOpacity={0.45} />
              )}
              <Scatter name="measured" data={measuredPts} fill={tokens.colors.accentLight} fillOpacity={0.8} />
              <Scatter
                name="frontier"
                data={frontierPts}
                fill={tokens.colors.accentDark}
                line={{ stroke: tokens.colors.accentDark, strokeWidth: 2 }}
                lineType="joint"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-2 text-center">{tt.frChartCaption}</p>
      </section>

      {/* Scope caveats (spec §8, verbatim) */}
      <section className="card p-6">
        <h2 className="font-bold mb-3">{tt.frCaveatsTitle}</h2>
        <ul className="space-y-2 text-sm text-[var(--text-secondary)] list-disc pl-5">
          {tt.frCaveats.map((c: string, i: number) => <li key={i}>{c}</li>)}
        </ul>
      </section>
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: Point }[];
  tt: ReturnType<typeof useI18n>;
}

function FrontierTooltip({ active, payload, tt }: TooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  const m = p.model;
  const gap = m.rightsizing_gap_pct;
  const av = m.avoidable_co2_kg;
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] p-3 rounded-lg shadow-lg text-sm text-[var(--text)] max-w-xs">
      <div className="font-semibold mb-1">
        {p.name}
        {m.on_frontier && <span className="ml-2 badge badge-open">{tt.frOnFrontier}</span>}
      </div>
      <div className="text-xs space-y-0.5 text-[var(--text-secondary)]">
        <div>{tt.frHoverCapability}: <span className="font-mono">{nf(p.x, { maximumFractionDigits: 1 })}</span></div>
        <div>
          {tt.frHoverIntensity}:{' '}
          <span className="font-mono">
            {m.energy_wh_per_mtok
              ? `${nf(m.energy_wh_per_mtok.low, { maximumFractionDigits: 0 })}–${nf(m.energy_wh_per_mtok.high, { maximumFractionDigits: 0 })} (${nf(p.y, { maximumFractionDigits: 0 })})`
              : nf(p.y, { maximumFractionDigits: 0 })}
          </span>
        </div>
        {gap && (
          <div>{tt.frHoverGap}: <span className="font-mono">{nf(gap.mid * 100, { maximumFractionDigits: 0 })}% ({nf(gap.low * 100, { maximumFractionDigits: 0 })}–{nf(gap.high * 100, { maximumFractionDigits: 0 })}%)</span></div>
        )}
        {av && av.mid > 0 && (
          <div>{tt.frHoverAvoidable}: <span className="font-mono">{formatCO2Parts(av).mid} {formatCO2Parts(av).unit}</span></div>
        )}
        {m.frontier_reference_slug && (
          <div>{tt.frHoverReference}: <span className="font-mono">{m.frontier_reference_slug}</span></div>
        )}
      </div>
    </div>
  );
}
