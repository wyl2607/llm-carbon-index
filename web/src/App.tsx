import { useEffect, useState } from 'react';
import type { LatestData, Model } from './types';
import { ScopeDisclaimerBanner } from './components/ScopeDisclaimerBanner';
import { GroupToggle, type GroupBy } from './components/GroupToggle';
import { Co2BarChart } from './components/Co2BarChart';
import { ModelsTable } from './components/ModelsTable';
import {
  formatCO2Range,
  formatModeledFraction,
  formatTokens,
} from './lib/format';

const isSampleData = (models: Model[]) =>
  models.length > 0 && models[0].slug.startsWith('example/');

function App() {
  const [data, setData] = useState<LatestData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('open_or_closed');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ONLY static fetch of the committed JSON. No other network, no secrets.
    let cancelled = false;
    fetch('/data/latest.json')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load data: ${r.status}`);
        return r.json();
      })
      .then((json: LatestData) => {
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (!cancelled) setError(String(e?.message || e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const models: Model[] = data?.models ?? [];
  const totals = data?.totals;

  return (
    <div style={{ padding: '12px 16px 40px', textAlign: 'left', maxWidth: 1080, margin: '0 auto' }}>
      <header style={{ marginBottom: 8 }}>
        <h1 style={{ margin: '8px 0 4px', fontSize: 28 }}>LLM Carbon Index</h1>
        <div style={{ color: '#555', fontSize: 13 }}>
          Phase 4 minimal static frontend • data date:{' '}
          {data ? data.data_date : '—'} • methodology v{data ? data.methodology_version : '—'}
        </div>
      </header>

      {loading && <div style={{ padding: 12 }}>Loading data…</div>}
      {error && (
        <div style={{ background: '#fee2e2', padding: 10, borderRadius: 4, color: '#991b1b' }}>
          Error loading /data/latest.json: {error}. Run the copy-data script or build first.
        </div>
      )}

      {data && (
        <>
          <ScopeDisclaimerBanner
            scopeNote={data.scope_note}
            sourceCitation={data.source_citation}
          />

          {isSampleData(models) && (
            <div
              style={{
                background: '#fefce8',
                border: '1px dashed #ca8a04',
                padding: '6px 10px',
                fontSize: 12,
                borderRadius: 4,
                marginBottom: 8,
              }}
            >
              ⚠ Using <strong>SAMPLE / placeholder data</strong> from tests/fixtures/latest.sample.json.
              Real <code>data/output/latest.json</code> will replace it once the pipeline (Phase 3) produces it.
              All numbers are illustrative with ranges.
            </div>
          )}

          {/* Honesty totals */}
          {totals && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                padding: '10px 14px',
                margin: '8px 0 16px',
                fontSize: '0.95em',
              }}
            >
              <strong>Daily modeled total:</strong> {formatCO2Range(totals.co2_kg)} CO₂eq<br />
              {formatModeledFraction(totals.modeled_traffic_fraction)}<br />
              Total tokens reported: {formatTokens(totals.total_tokens)} (uncovered {formatTokens(totals.uncovered_tokens)})
            </div>
          )}

          <GroupToggle groupBy={groupBy} onChange={setGroupBy} />

          <h2 style={{ fontSize: 18, margin: '12px 0 4px' }}>CO₂ by model (mid + range)</h2>
          {models.length > 0 ? (
            <Co2BarChart models={models} groupBy={groupBy} />
          ) : (
            <div>No models.</div>
          )}

          <h2 style={{ fontSize: 18, margin: '16px 0 4px' }}>Models table (sortable ranges)</h2>
          {models.length > 0 ? (
            <ModelsTable models={models} />
          ) : (
            <div>No models.</div>
          )}

          <footer style={{ marginTop: 32, fontSize: 11, color: '#666', borderTop: '1px solid #eee', paddingTop: 8 }}>
            Static build only. Fetches <code>/data/latest.json</code> at build/dev time via prebuild copy.
            No runtime backend, no additional network calls. Ranges are carried end-to-end (low/mid/high).
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
