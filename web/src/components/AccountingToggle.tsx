import React from 'react';

export type AccountingMethod = 'location' | 'market';

interface Props {
  method: AccountingMethod;
  onChange: (method: AccountingMethod) => void;
}

export const AccountingToggle: React.FC<Props> = ({ method, onChange }) => {
  return (
    <div className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg inline-flex">
      <button
        onClick={() => onChange('location')}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          method === 'location'
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
        }`}
        title="Physical grid emissions based on region"
      >
        Location-based
      </button>
      <button
        onClick={() => onChange('market')}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          method === 'market'
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
        }`}
        title="Factors in Renewable Energy Certificates (RECs) and PPAs"
      >
        Market-based
      </button>
    </div>
  );
};
