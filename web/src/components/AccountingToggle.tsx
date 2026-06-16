import React from 'react';

export type AccountingMethod = 'location' | 'market';

interface Props {
  method: AccountingMethod;
  onChange: (method: AccountingMethod) => void;
}

export const AccountingToggle: React.FC<Props> = ({ method, onChange }) => {
  return (
    <div className="inline-flex  overflow-hidden border border-border text-xs font-medium bg-bg-card">
      <button
        onClick={() => onChange('location')}
        className={`px-3.5 py-1 transition ${method === 'location' ? 'bg-white text-black' : 'text-text hover:bg-bg-card'}`}
        title="Physical grid emissions (location of inference)"
      >
        Location
      </button>
      <button
        onClick={() => onChange('market')}
        className={`px-3.5 py-1 transition border-l border-border ${method === 'market' ? 'bg-white text-black' : 'text-text hover:bg-bg-card'}`}
        title="Market-based (incl. RECs / PPAs)"
      >
        Market
      </button>
    </div>
  );
};
