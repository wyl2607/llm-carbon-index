import React from 'react';
import type { Range } from '../types';
import type { Lang } from '../lib/i18n';
import { useI18n } from '../lib/i18n';
import { Leaf, Zap, Info } from 'lucide-react';
import { computeEquivalents, EQUIV_SOURCES, computeClimateScore } from '../lib/equivalences';
import { useAnimatedNumber } from '../lib/useAnimatedNumber';
import { nf } from '../lib/format';
import {
  getRegimeMultiplierFromSliders,
  promptClassFromValue,
  batchClassFromValue,
  applyRegimeToRange,
} from '../lib/scenario';

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

  // P6: local state for regime/prompt-length sliders (no parent lift; self-contained for listed-file scope)
  const [promptSlider, setPromptSlider] = React.useState<number>(50); // 0 short ... 100 long
  const [batchSlider, setBatchSlider] = React.useState<number>(75); // 0 low-batch (high energy) ... 100 high-batch (eff)
  const regimeMult = getRegimeMultiplierFromSliders(promptSlider, batchSlider);
  const promptCls = promptClassFromValue(promptSlider);
  const batchCls = batchClassFromValue(batchSlider);
  const regimeLabel = `${promptCls} prompt / ${batchCls} batch`;
  // illustrative: scale the received ref co2 by regime (co2 linear with energy); used only for P6 demo numbers inside this component
  const regimeEffectiveCo2 = originalCo2 ? applyRegimeToRange(originalCo2, regimeMult) : undefined;

  const reductionMid = originalCo2 && simulatedCo2 
    ? Math.max(0, Math.round(originalCo2.mid - simulatedCo2.mid))
    : 0;

  const reductionPercent = originalCo2 && originalCo2.mid > 0
    ? ((reductionMid / originalCo2.mid) * 100).toFixed(1)
    : '0';

  // No scenario applied yet (or it produces no reduction): avoid the misleading
  // green "−0" hero and the wall-of-zeros equivalents grid on first load.
  const hasScenario = greenShiftPercent > 0 && reductionMid > 0;

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
    <div className="my-8 card p-7 sm:p-9 text-[var(--text)] relative overflow-hidden border-[var(--accent-border)]">
      <div className="absolute top-5 right-5 px-3 py-1 rounded-full text-[10px] font-bold tracking-[1.5px] uppercase bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent-border)] z-20">
        {accountingMethod.toUpperCase()}-BASED
      </div>

      <div className="relative z-10">
        <div className="flex items-start gap-3 mb-3">
          <div className="mt-1 p-2.5 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent-border)]">
            <Zap className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em]">{tt.scenarioTitle}</h2>
            <p className="mt-1.5 max-w-3xl text-[15px] text-[var(--text-secondary)] leading-relaxed">
              {tt.scenarioSubtitle}
            </p>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <div className="flex justify-between items-baseline mb-2 px-1">
              <label htmlFor="grid-shift" className="text-xs font-semibold tracking-widest text-[var(--accent)]/80 uppercase">
                {tt.shiftLabel}
              </label>
              <span className="font-mono text-4xl font-black text-[var(--accent)] tabular-nums tracking-[-1.5px]">
                {greenShiftPercent}<span className="text-2xl font-semibold text-[var(--accent)]/70">%</span>
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
              className="impact-slider w-full accent-[var(--accent)] cursor-pointer"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={greenShiftPercent}
              aria-label="Percentage of traffic shifted to clean grid"
            />

            <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-medium tracking-widest px-0.5 mt-1.5">
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
                      ? 'btn-primary' 
                      : 'btn-secondary border-[var(--border)] hover:border-[var(--accent-border)]'
                  }`}
                  aria-pressed={greenShiftPercent === p.val}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {modeledFraction > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 text-xs bg-[var(--bg-elev)] border border-[var(--border)] px-3 py-1.5 rounded-xl text-[var(--accent)]/90">
                <span className="inline-block w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse" />
                {tt.maxPotentialNote(maxPotential)}
              </div>
            )}

            {/* P6: regime + prompt-length sliders (dynamic batching / context) — local state, pure math from scenario.ts */}
            <div className="mt-6 pt-4 border-t border-[var(--accent-border)]">
              <div className="text-xs font-semibold tracking-widest text-[var(--accent)]/80 uppercase mb-1">{tt.regimeTitle}</div>
              <div className="text-[11px] text-[var(--text-secondary)] mb-3">{tt.regimeIntro}</div>

              <div className="mb-3">
                <div className="flex justify-between items-baseline mb-1 px-1">
                  <label className="text-xs font-semibold tracking-widest text-[var(--accent)]/80 uppercase">{tt.regimePromptLabel}</label>
                  <span className="font-mono text-sm text-[var(--accent)]/90">{promptCls}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={promptSlider}
                  onChange={(e) => setPromptSlider(Number(e.target.value))}
                  className="impact-slider w-full accent-[var(--accent)] cursor-pointer"
                  aria-label="Prompt length regime slider (P6)"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] px-0.5">{tt.regimePromptScale}</div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-1 px-1">
                  <label className="text-xs font-semibold tracking-widest text-[var(--accent)]/80 uppercase">{tt.regimeBatchLabel}</label>
                  <span className="font-mono text-sm text-[var(--accent)]/90">{batchCls}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={batchSlider}
                  onChange={(e) => setBatchSlider(Number(e.target.value))}
                  className="impact-slider w-full accent-[var(--accent)] cursor-pointer"
                  aria-label="Batch utilization regime slider (P6)"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] px-0.5">{tt.regimeBatchScale}</div>
              </div>

              <div className="mt-3 text-[11px] px-1 font-mono text-[var(--accent)]/90">
                {tt.regimeMultLabel} <span className="text-[var(--accent)] font-bold">{regimeMult.mid.toFixed(2)}×</span> (range {regimeMult.low.toFixed(2)}–{regimeMult.high.toFixed(2)})
                <span className="ml-2 text-[var(--accent)]/60">[{regimeLabel}]</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl bg-[var(--bg)] border border-[var(--accent-border)] p-6 text-center">
              <div className="uppercase tracking-[2px] text-xs font-bold text-[var(--accent)]/70 mb-2 flex items-center justify-center gap-2">
                <Leaf className="w-3.5 h-3.5" /> {tt.dailyAvoided}
              </div>
              <div className={`font-mono text-[56px] leading-none font-black tracking-[-3.5px] tabular-nums ${hasScenario ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                {hasScenario ? `−${nf(animatedReduction)}` : '0'}
              </div>
              <div className="text-[var(--accent)]/70 text-sm font-medium mt-1">{tt.kgCO2}</div>
              {/* P6 regime effect note (illustrative; scales base energy hence absolute CO2 for fixed grid) */}
              {regimeEffectiveCo2 && (
                <div className="mt-2 text-[10px] text-[var(--warning)]/80">
                  {tt.regimeEffectNote(regimeMult.mid.toFixed(2), nf(regimeEffectiveCo2.mid, { maximumFractionDigits: 0 }))}
                </div>
              )}

              {greenShiftPercent > 0 && (
                <div className="mt-3 text-sm">
                  <span className="px-3 py-px bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent-border)] rounded-full text-xs font-bold">
                    −{nf(parseFloat(reductionPercent) || 0, { maximumFractionDigits: 1 })}%
                  </span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-[var(--accent)]/70 mb-2 px-1">
                {tt.equivTitle}
                <span title={EQUIV_SOURCES} className="info-tip"><Info className="w-3.5 h-3.5" /></span>
              </div>
              {hasScenario ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2.5">
                  <div className="font-mono text-2xl font-bold text-[var(--text)] tabular-nums">{nf(equiv.cars)}</div>
                  <div className="text-[12px] text-[var(--text-secondary)] leading-tight mt-px">{tt.equivCars}</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2.5">
                  <div className="font-mono text-2xl font-bold text-[var(--text)] tabular-nums">{nf(equiv.flights)}</div>
                  <div className="text-[12px] text-[var(--text-secondary)] leading-tight mt-px">{tt.equivFlights}</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2.5">
                  <div className="font-mono text-2xl font-bold text-[var(--text)] tabular-nums">{nf(equiv.trees)}</div>
                  <div className="text-[12px] text-[var(--text-secondary)] leading-tight mt-px">{tt.equivTrees}</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2.5">
                  <div className="font-mono text-2xl font-bold text-[var(--text)] tabular-nums">{nf(equiv.homes)}</div>
                  <div className="text-[12px] text-[var(--text-secondary)] leading-tight mt-px">{tt.equivHomes}</div>
                </div>
                <div className="rounded-xl border border-[var(--warning-border)] bg-[var(--bg-elev)] px-3 py-2.5">
                  <div className="font-mono text-2xl font-bold text-[var(--warning)] tabular-nums">{nf(equiv.homes)}</div>
                  <div className="text-[11px] text-[var(--warning)]/70 leading-tight mt-px">{tt.equivDeHomes}</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2.5 col-span-2 sm:col-span-1 text-[11px] text-[var(--text-secondary)]">
                  {tt.equivEnergiewende}
                </div>
              </div>
              ) : (
              <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elev)] px-4 py-3.5 text-[13px] text-[var(--text-muted)] leading-relaxed">
                {tt.sliderHint}
              </div>
              )}
              <p className="text-[10px] text-[var(--text-muted)] mt-2 px-1 leading-snug">{tt.equivNote}</p>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-xs text-[var(--accent)]/70 mb-1 px-0.5">
                <span>{tt.climateScore}</span>
                <span className="font-mono text-[var(--accent)] font-bold">{climateScore}</span>
              </div>
              <div className="h-2.5 w-full bg-[var(--bg-elev)] rounded-full overflow-hidden border border-[var(--border)]">
                <div 
                  className="h-full bg-gradient-to-r from-[var(--accent-dark)] to-[var(--accent)] transition-all duration-500"
                  style={{ width: `${climateScore}%` }}
                  aria-valuenow={climateScore}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1">{tt.climateScoreNote}</div>
            </div>

            <div className="text-[13px] leading-relaxed text-[var(--text-secondary)] border-l-2 border-[var(--accent-border)] pl-3">
              {greenShiftPercent > 0 ? (
                accountingMethod === 'location' 
                  ? tt.impactNote(reductionPercent)
                  : tt.impactNoteMarket(reductionPercent)
              ) : (
                <span className="text-[var(--text-muted)] italic">{tt.sliderHint}</span>
              )}
              <div className="mt-2 text-[11px] text-[var(--text-secondary)]">{tt.deEuHint}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
