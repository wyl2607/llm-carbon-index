import React from 'react';
import type { Totals, Range } from '../types';
import { formatCO2Range, formatTokens } from '../lib/format';
import type { Lang } from '../lib/i18n';
import { useI18n } from '../lib/i18n';
import { useAnimatedNumber } from '../lib/useAnimatedNumber';
import { Cpu, Cloud, Droplets, Zap, TrendingDown } from 'lucide-react';

interface Props {
  totals: Totals;
  baselineCo2?: Range;
  shift?: number;
  lang: Lang;
}

export const KpiCards: React.FC<Props> = ({ totals, baselineCo2, shift = 0, lang }) => {
  const tt = useI18n(lang);

  const avgGCo2e = totals.total_tokens > 0 
    ? ((totals.co2_kg.mid * 1000) / (totals.total_tokens / 1000)).toFixed(1)
    : '0';

  const avoided = baselineCo2 ? Math.max(0, Math.round(baselineCo2.mid - totals.co2_kg.mid)) : 0;
  const pctAvoided = baselineCo2 && baselineCo2.mid > 0 ? ((avoided / baselineCo2.mid) * 100).toFixed(1) : '0';

  const waterKL = totals.water_liters ? (totals.water_liters.mid / 1000).toFixed(1) : '—';

  const isActive = shift > 0;

  // Lightweight animated numbers for storytelling (no extra deps)
  const animatedAvoided = useAnimatedNumber(avoided, 650);
  const animatedPct = useAnimatedNumber(parseFloat(pctAvoided) || 0, 650);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <div className="card p-5 flex flex-col">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#717771] mb-1.5">
          <Cpu className="w-3.5 h-3.5" /> {tt.kpiTokens}
        </div>
        <div className="font-mono text-4xl font-black tracking-[-1.5px] mt-auto tabular-nums">{formatTokens(totals.total_tokens)}</div>
        <div className="text-[11px] text-[#717771] mt-1">Uncovered: {formatTokens(totals.uncovered_tokens)}</div>
      </div>

      <div className="card p-5 flex flex-col border-emerald-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400/80 mb-1.5">
            <Cloud className="w-3.5 h-3.5" /> {tt.kpiCo2}
          </div>
          {isActive && <span className="text-[10px] px-2 py-px rounded bg-emerald-950 text-emerald-400">SCENARIO</span>}
        </div>
        <div className="font-mono text-[34px] leading-none font-black tracking-[-1.2px] text-emerald-400 tabular-nums mt-1">
          {formatCO2Range(totals.co2_kg).split('(')[0].trim()}
        </div>
        <div className="text-xs text-[#a1a6a1] mt-1">Range: {Math.round(totals.co2_kg.low).toLocaleString()}–{Math.round(totals.co2_kg.high).toLocaleString()} kg</div>
      </div>

      <div className={`card p-5 flex flex-col ${isActive ? 'ring-1 ring-emerald-900/60' : ''}`}>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400/80 mb-1.5">
          <TrendingDown className="w-3.5 h-3.5" /> {tt.kpiAvoided}
        </div>
        <div className="font-mono text-4xl font-black tracking-[-1.5px] tabular-nums text-emerald-400">
          −{animatedAvoided.toLocaleString()}
        </div>
        <div className="text-xs mt-0.5 text-emerald-400/70">{animatedPct.toFixed(1)}% vs baseline</div>
        <div className="text-[10px] text-[#717771] mt-auto">{tt.kpiAvoidedSub}</div>
      </div>

      <div className="card p-5 flex flex-col">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#717771] mb-1.5">
          <Zap className="w-3.5 h-3.5" /> {tt.kpiIntensity}
        </div>
        <div className="font-mono text-[34px] font-black tracking-[-1.5px] tabular-nums mt-0.5">{avgGCo2e} <span className="text-xl text-[#717771]">g</span></div>
        <div className="text-[11px] text-[#717771]">{tt.kpiIntensitySub}</div>
      </div>

      <div className="card p-5 flex flex-col">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#717771] mb-1.5">
          <Droplets className="w-3.5 h-3.5" /> {tt.kpiWater}
        </div>
        <div className="font-mono text-[34px] font-black tracking-[-1.5px] tabular-nums mt-0.5">{waterKL} <span className="text-xl text-[#717771]">kL</span></div>
        <div className="text-[11px] text-[#717771] mt-auto">{tt.kpiWaterSub}</div>
      </div>

      {/* Green Substitution Potential - prominent for storytelling & thesis */}
      <div className="card p-5 flex flex-col border-emerald-900/50 bg-[#0a0f0a]">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400/80 mb-1">
          <Zap className="w-3.5 h-3.5" /> Green Substitution Potential
        </div>
        <div className="font-mono text-4xl font-black tracking-[-1.5px] text-emerald-400 tabular-nums mt-1">
          {isActive ? animatedPct.toFixed(1) : '0.0'}<span className="text-2xl">%</span>
        </div>
        <div className="text-[11px] text-emerald-300/70 mt-1">of modeled footprint movable to ~50 g grids</div>
        <div className="text-[10px] text-[#717771] mt-auto">Higher = stronger decarbonization lever</div>
      </div>
    </div>
  );
};

