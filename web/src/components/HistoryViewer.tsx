import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TimeseriesDay } from '../types';
import type { Lang } from '../lib/i18n';
import { useI18n } from '../lib/i18n';
import { nf } from '../lib/format';

// Need at least this many days before a trend line is meaningful; below it the
// chart is just a lonely point in an empty frame, so show a collecting-state.
const MIN_TREND_DAYS = 3;

interface Props { lang?: Lang; }

export const HistoryViewer: React.FC<Props> = ({ lang = 'en' }) => {
  const tt = useI18n(lang);
  const [data, setData] = useState<TimeseriesDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/timeseries.json`)
      .then((r) => r.json())
      .then((json: TimeseriesDay[]) => { if (!cancelled) setData(json); })
      .catch((e) => console.error("Failed to load timeseries", e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="h-60 card skeleton" />;
  if (data.length === 0) return null;

  if (data.length < MIN_TREND_DAYS) {
    return (
      <div className="card p-6">
        <div className="mb-5">
          <h2 className="font-bold">{tt.historyTitle}</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{tt.historySub}</p>
        </div>
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elev)] px-6 py-10 text-center">
          <div className="text-sm font-semibold text-[var(--text-secondary)]">{tt.historyCollecting}</div>
          <div className="mt-1.5 text-xs text-[var(--text-muted)]">
            {tt.historyCollectingSub.replace('{n}', String(data.length)).replace('{min}', String(MIN_TREND_DAYS))}
          </div>
        </div>
        <div className="mt-5 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] text-sm">
          <div className="font-semibold mb-1 text-[var(--accent)]">{tt.jevonsTitle}</div>
          <p className="text-[var(--text-secondary)] leading-snug text-[13px]">{tt.jevonsBody}</p>
        </div>
      </div>
    );
  }

  const chartData = data.map(day => {
    const totalTokens = day.totals.total_tokens / 1_000_000_000;
    const totalCo2 = day.totals.co2_kg.mid;
    const efficiency = totalTokens > 0 ? (totalCo2 * 1000) / (day.totals.total_tokens / 1_000_000) : 0;
    return { date: day.data_date, tokensBillion: totalTokens, co2Kg: totalCo2, efficiency };
  });

  return (
    <div className="card p-6">
      <div className="mb-5">
        <h2 className="font-bold">{tt.historyTitle}</h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{tt.historySub}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
        <div>
          <div className="text-xs font-semibold text-[var(--text-secondary)] mb-2">{tt.historyCo2}</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cCo2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="var(--grid-line)" />
                <XAxis dataKey="date" tick={{fontSize:10, fill:'var(--text-muted)'}} tickLine={false} axisLine={{stroke:'var(--border)'}} />
                <YAxis tickFormatter={v => nf(Math.round(v))} tick={{fontSize:10, fill:'var(--text-muted)'}} tickLine={false} axisLine={{stroke:'var(--border)'}} />
                <Tooltip contentStyle={{background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:6, fontSize:12, color:'var(--text)'}} />
                <Area type="monotone" dataKey="co2Kg" stroke="var(--accent)" strokeWidth={2.5} fill="url(#cCo2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-[var(--text-secondary)] mb-2">{tt.historyEff}</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cEff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5c9ab5" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#5c9ab5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="var(--grid-line)" />
                <XAxis dataKey="date" tick={{fontSize:10, fill:'var(--text-muted)'}} tickLine={false} axisLine={{stroke:'var(--border)'}} />
                <YAxis tickFormatter={v => nf(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} tick={{fontSize:10, fill:'var(--text-muted)'}} tickLine={false} axisLine={{stroke:'var(--border)'}} />
                <Tooltip contentStyle={{background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:6, fontSize:12, color:'var(--text)'}} />
                <Area type="monotone" dataKey="efficiency" stroke="#5c9ab5" strokeWidth={2.5} fill="url(#cEff)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-5 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] text-sm">
        <div className="font-semibold mb-1 text-[var(--accent)]">{tt.jevonsTitle}</div>
        <p className="text-[var(--text-secondary)] leading-snug text-[13px]">{tt.jevonsBody}</p>
      </div>
    </div>
  );
};
