import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TimeseriesDay } from '../types';

export const HistoryViewer: React.FC = () => {
  const [data, setData] = useState<TimeseriesDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/timeseries.json`)
      .then((r) => r.json())
      .then((json: TimeseriesDay[]) => {
        if (!cancelled) {
          setData(json);
        }
      })
      .catch((e) => {
        console.error("Failed to load timeseries", e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="animate-pulse h-64 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>;
  }

  if (data.length === 0) {
    return null;
  }

  // Transform data for recharts
  const chartData = data.map(day => {
    const totalTokens = day.totals.total_tokens / 1_000_000_000; // in billions
    const totalCo2 = day.totals.co2_kg.mid;
    
    // Efficiency: gCO2 per million tokens
    const efficiency = totalTokens > 0 
      ? (totalCo2 * 1000) / (day.totals.total_tokens / 1_000_000) 
      : 0;

    return {
      date: day.data_date,
      tokensBillion: totalTokens,
      co2Kg: totalCo2,
      efficiency: efficiency,
    };
  });

  return (
    <div className="my-10 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Historical Trends & Efficiency</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Tracking the growth of inference volume against efficiency improvements over time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Total Daily Emissions (kg CO₂)</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" tick={{fontSize: 12}} tickLine={false} axisLine={false} minTickGap={30} stroke="#64748b" />
                <YAxis tickFormatter={(val) => Math.round(val).toLocaleString()} tick={{fontSize: 12}} tickLine={false} axisLine={false} stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ color: '#34d399' }}
                  formatter={(value: any) => [Math.round(value).toLocaleString() + ' kg', 'CO₂']}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="co2Kg" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCo2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Ecosystem Efficiency (gCO₂ / M tokens)</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" tick={{fontSize: 12}} tickLine={false} axisLine={false} minTickGap={30} stroke="#64748b" />
                <YAxis tickFormatter={(val) => val.toFixed(1)} tick={{fontSize: 12}} tickLine={false} axisLine={false} stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ color: '#60a5fa' }}
                  formatter={(value: any) => [value.toFixed(2) + ' g', 'Per M Tokens']}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="efficiency" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorEff)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">The Jevons Paradox in AI</h4>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          While newer models become vastly more efficient at generating text (gCO₂ per token drops), the total volume of inference traffic tends to outpace these gains. This phenomenon, where increased efficiency leads to higher overall resource consumption, underscores why tracking aggregate emissions is just as important as measuring per-model efficiency.
        </p>
      </div>
    </div>
  );
};
