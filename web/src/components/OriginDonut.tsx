import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { Model } from '../types';

const COLORS: Record<string, string> = {
  CN: '#f97316',
  US: '#3b82f6',
  EU: '#8b5cf6',
  OTHER: '#64748b',
};

interface Props {
  models: Model[];
}

export const OriginDonut: React.FC<Props> = ({ models }) => {
  const grouped = models.reduce((acc, m) => {
    const key = m.origin;
    const val = m.co2_kg.mid;
    acc[key] = (acc[key] || 0) + val;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(grouped)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="h-[238px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="48%"
            innerRadius={62}
            outerRadius={92}
            paddingAngle={2}
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={COLORS[entry.name] || '#64748b'} />
            ))}
          </Pie>
          <Tooltip 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any) => [`${Math.round(Number(v) || 0).toLocaleString()} kg`, 'CO₂ mid'] as [string, string]}
            contentStyle={{ background: '#121512', border: '1px solid #242924', borderRadius: 8, color: '#e4e7e4', fontSize: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs mt-1">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-1.5 text-[#a1a6a1]">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{background: COLORS[d.name]}} />
            {d.name} <span className="font-mono text-[#e4e7e4]/70">{((d.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
