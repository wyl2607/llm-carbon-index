import React from 'react';
import type { Range } from '../types';
import { formatCO2Range } from '../lib/format';

interface Props {
  greenShiftPercent: number;
  setGreenShiftPercent: (val: number) => void;
  originalCo2: Range | undefined;
  simulatedCo2: Range | undefined;
}

export const WhatIfSimulator: React.FC<Props> = ({ 
  greenShiftPercent, 
  setGreenShiftPercent,
  originalCo2,
  simulatedCo2
}) => {
  const reductionMid = originalCo2 && simulatedCo2 
    ? originalCo2.mid - simulatedCo2.mid 
    : 0;
    
  const reductionPercent = originalCo2 && originalCo2.mid > 0
    ? ((reductionMid / originalCo2.mid) * 100).toFixed(1)
    : 0;

  return (
    <div className="my-10 bg-gradient-to-br from-emerald-900 to-slate-900 rounded-2xl shadow-lg border border-emerald-800/50 p-6 sm:p-8 text-white relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/3"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-y-1/3 -translate-x-1/3"></div>

      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
        <div className="w-full md:w-1/2">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h2 className="text-2xl font-bold tracking-tight">Grid Substitution Simulator</h2>
          </div>
          <p className="text-emerald-100/80 text-sm mb-6 leading-relaxed">
            What if we spatially shifted AI inference workloads to the cleanest regional grids (e.g., France/Nordics at ~50 gCO₂/kWh) instead of the global average? Drag the slider to see the potential carbon reduction.
          </p>

          <div className="mb-8">
            <div className="flex justify-between items-end mb-2">
              <label htmlFor="grid-shift" className="text-sm font-medium text-emerald-50">
                Workload Shifted to Green Grid:
              </label>
              <span className="text-2xl font-bold text-emerald-400">{greenShiftPercent}%</span>
            </div>
            <input 
              id="grid-shift"
              type="range" 
              min="0" 
              max="100" 
              step="5"
              value={greenShiftPercent}
              onChange={(e) => setGreenShiftPercent(Number(e.target.value))}
              className="w-full h-2 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-xs text-emerald-200/60 mt-2 font-medium">
              <span>0% (Current Reality)</span>
              <span>100% (Maximum Optimization)</span>
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/2 flex flex-col justify-center">
          <div className="bg-slate-900/60 backdrop-blur-sm border border-emerald-500/20 rounded-xl p-6 text-center">
            <h3 className="text-sm font-medium text-emerald-200/80 uppercase tracking-widest mb-2">
              Potential Daily Reduction
            </h3>
            <div className="flex items-baseline justify-center gap-2 text-emerald-400">
              <span className="text-5xl font-extrabold tracking-tighter">
                -{reductionMid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-xl font-medium text-emerald-400/80">kg CO₂eq</span>
            </div>
            
            {greenShiftPercent > 0 && (
              <div className="mt-4 pt-4 border-t border-emerald-800/50 text-sm text-emerald-100/90">
                This spatial workload shifting could reduce total inference emissions by <strong className="text-white bg-emerald-500/20 px-1.5 py-0.5 rounded">{reductionPercent}%</strong> while delivering the same compute.
              </div>
            )}
            {greenShiftPercent === 0 && (
              <div className="mt-4 pt-4 border-t border-emerald-800/50 text-sm text-slate-400">
                Move the slider to simulate emissions reduction.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
