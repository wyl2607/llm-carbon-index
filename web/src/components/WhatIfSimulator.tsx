import React from 'react';
import type { Range } from '../types';
import type { Lang } from '../lib/i18n';
import { useI18n } from '../lib/i18n';
import { Leaf, Zap, Info } from 'lucide-react';
import { computeEquivalents, EQUIV_SOURCES, computeClimateScore } from '../lib/equivalences';
import { useAnimatedNumber } from '../lib/useAnimatedNumber';
import { nf } from '../lib/format';

interface Props {
  greenShiftPercent: number;
  setGreenShiftPercent: (val: number) => void;
  originalCo2: Range | undefined;
  simulatedCo2: Range | undefined;
  accountingMethod?: 'location' | 'market';
  modeledFraction?: number;
  lang: Lang;
}

export const WhatIfSimulator: React.FC<Props> = ({ 
  greenShiftPercent, 
  setGreenShiftPercent,
  originalCo2,
  simulatedCo2,
  accountingMethod = 'location',
  modeledFraction = 0,
  lang
}) => {
  const tt = useI18n(lang);

  const reductionMid = originalCo2 && simulatedCo2 
    ? Math.max(0, Math.round(originalCo2.mid - simulatedCo2.mid))
    : 0;

  const reductionPercent = originalCo2 && originalCo2.mid > 0
    ? ((reductionMid / originalCo2.mid) * 100).toFixed(1)
    : '0';

  const equiv = computeEquivalents(reductionMid);

  const maxPotential = modeledFraction > 0 ? (modeledFraction * 42).toFixed(1) : '0';

  // Rich DE/EU-focused presets for German job market & EU reporting
  const presets = [
    { label: tt.presetReality, val: 0 },
    { label: tt.presetEuAvg, val: 30 },
    { label: tt.presetFrankfurt, val: 20 },
    { label: tt.presetEnergiewende, val: 70 },
    { label: tt.presetMax, val: 100 },
  ];

  // Climate Neutrality Score (lightweight, no extra deps)
  const climateScore = originalCo2 ? computeClimateScore(simulatedCo2?.mid || 0, originalCo2.mid) : 0;

  const animatedReduction = useAnimatedNumber(reductionMid, 700);

  return (
    <div className="my-8 card p-7 sm:p-9 text-text relative overflow-hidden border-accent-border" style={{background: 'linear-gradient(145deg, #0c0f0c, #0a0d0a)'}}>
      <div className="absolute top-5 right-5 px-3 py-1  text-[10px] font-bold tracking-[1.5px] uppercase bg-accent-bg text-accent border border-accent-border backdrop-blur z-20">
        {accountingMethod.toUpperCase()}-BASED
      </div>

      <div className="absolute -top-40 -right-40 w-[520px] h-[520px] bg-accent-bg  blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[420px] h-[420px] bg-teal-500/5  blur-[100px] pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-start gap-3 mb-3">
          <div className="mt-1 p-2.5  bg-accent-bg border border-accent-border">
            <Zap className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em]">{tt.scenarioTitle}</h2>
            <p className="mt-1.5 max-w-3xl text-[15px] text-accent leading-relaxed">
              {tt.scenarioSubtitle}
            </p>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <div className="flex justify-between items-baseline mb-2 px-1">
              <label htmlFor="grid-shift" className="text-xs font-semibold tracking-widest text-accent uppercase">
                {tt.shiftLabel}
              </label>
              <span className="font-mono text-4xl font-black text-accent tabular-nums tracking-[-1.5px] drop-shadow-[0_0_12px_rgba(255,204,0,0.35)]">
                {greenShiftPercent}<span className="text-2xl font-semibold text-accent">%</span>
              </span>
            </div>

            <input
              id="grid-shift"
              type="range"
              min="0"
              max="100"
              step="1"
              value={greenShiftPercent}
              onChange={(e) => setGreenShiftPercent(Number(e.target.value))}
              className="impact-slider w-full accent-emerald-400 cursor-pointer"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={greenShiftPercent}
              aria-label="Percentage of traffic shifted to clean grid"
            />

            <div className="flex justify-between text-[10px] text-accent font-medium tracking-widest px-0.5 mt-1.5">
              <div>0% — {tt.presetReality.split(' ')[0]}</div>
              <div>100% — MAX GREEN</div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {presets.map(p => (
                <button
                  key={p.val}
                  onClick={() => setGreenShiftPercent(p.val)}
                  className={`btn text-xs py-1.5 px-4 transition-all active:scale-[0.985] ${
                    greenShiftPercent === p.val 
                      ? 'btn-primary shadow-[0_0_0_1px_#052e16,0_0_18px_-2px_var(--accent)]' 
                      : 'btn-secondary border-border hover:border-accent-border'
                  }`}
                  aria-pressed={greenShiftPercent === p.val}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {modeledFraction > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 text-xs bg-bg-card border border-border px-3 py-1.5  text-accent">
                <span className="inline-block w-1.5 h-1.5 bg-accent-bg  animate-pulse" />
                {tt.maxPotentialNote(maxPotential)}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className=" bg-bg-card border border-accent-border p-6 text-center">
              <div className="uppercase tracking-[2px] text-xs font-bold text-accent mb-2 flex items-center justify-center gap-2">
                <Leaf className="w-3.5 h-3.5" /> {tt.dailyAvoided}
              </div>
              <div className="font-mono text-[56px] leading-none font-black text-accent tracking-[-3.5px] tabular-nums drop-shadow-[0_0_25px_rgba(255,204,0,.25)]">
                −{nf(animatedReduction)}
              </div>
              <div className="text-accent text-sm font-medium mt-1">{tt.kgCO2}</div>

              {greenShiftPercent > 0 && (
                <div className="mt-3 text-sm">
                  <span className="px-3 py-px bg-accent-bg text-accent border border-accent-border  text-xs font-bold">
                    −{nf(parseFloat(reductionPercent) || 0, { maximumFractionDigits: 1 })}%
                  </span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-accent mb-2 px-1">
                {tt.equivTitle}
                <span title={EQUIV_SOURCES} className="info-tip"><Info className="w-3.5 h-3.5" /></span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                <div className=" border border-border bg-bg-card px-3 py-2.5">
                  <div className="font-mono text-2xl font-bold text-white tabular-nums">{nf(equiv.cars)}</div>
                  <div className="text-[12px] text-accent leading-tight mt-px">{tt.equivCars}</div>
                </div>
                <div className=" border border-border bg-bg-card px-3 py-2.5">
                  <div className="font-mono text-2xl font-bold text-white tabular-nums">{nf(equiv.flights)}</div>
                  <div className="text-[12px] text-accent leading-tight mt-px">{tt.equivFlights}</div>
                </div>
                <div className=" border border-border bg-bg-card px-3 py-2.5">
                  <div className="font-mono text-2xl font-bold text-white tabular-nums">{nf(equiv.trees)}</div>
                  <div className="text-[12px] text-accent leading-tight mt-px">{tt.equivTrees}</div>
                </div>
                <div className=" border border-border bg-bg-card px-3 py-2.5">
                  <div className="font-mono text-2xl font-bold text-white tabular-nums">{nf(equiv.homes)}</div>
                  <div className="text-[12px] text-accent leading-tight mt-px">{tt.equivHomes}</div>
                </div>
                <div className=" border border-warning-border bg-bg-card px-3 py-2.5">
                  <div className="font-mono text-2xl font-bold text-warning tabular-nums">{nf(equiv.homes)}</div>
                  <div className="text-[11px] text-warning leading-tight mt-px">{tt.equivDeHomes}</div>
                </div>
                <div className=" border border-border bg-bg-card px-3 py-2.5 col-span-2 sm:col-span-1 text-[11px] text-accent">
                  {tt.equivEnergiewende}
                </div>
              </div>
              <p className="text-[10px] text-accent mt-2 px-1 leading-snug">{tt.equivNote}</p>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-xs text-accent mb-1 px-0.5">
                <span>{tt.climateScore}</span>
                <span className="font-mono text-accent font-bold">{climateScore}</span>
              </div>
              <div className="h-2.5 w-full bg-bg-card  overflow-hidden border border-border">
                <div 
                  className="h-full bg-accent   transition-all duration-500"
                  style={{ width: `${climateScore}%` }}
                  aria-valuenow={climateScore}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <div className="text-[10px] text-text mt-1">{tt.climateScoreNote}</div>
            </div>

            <div className="text-[13px] leading-relaxed text-accent border-l-2 border-accent-border pl-3">
              {greenShiftPercent > 0 ? (
                accountingMethod === 'location' 
                  ? tt.impactNote(reductionPercent)
                  : tt.impactNoteMarket(reductionPercent)
              ) : (
                <span className="text-accent italic">{lang === 'zh' ? '移动滑块探索情景影响。' : 'Move the slider to explore decarbonization impact.'}</span>
              )}
              <div className="mt-2 text-[11px] text-accent">{tt.deEuHint}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
