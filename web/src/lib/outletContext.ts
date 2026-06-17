import { useOutletContext } from 'react-router-dom';
import type { LatestData, Model, Range, SensitivityData, Totals } from '../types';
import type { Lang } from './i18n';
import type { AccountingMethod } from '../components/AccountingToggle';

/**
 * Shared state the Layout fetches once and hands to every page via
 * react-router's <Outlet context>. Pages read it through `usePageData()`
 * instead of prop-drilling, so the JSON is fetched a single time.
 */
export interface PageContext {
  /** Raw, baseline (non-scenario) data — use this for ranking/region/advice pages. */
  data: LatestData;
  sensData: SensitivityData | null;
  /** Baseline + active green-shift simulation applied — the Overview dashboard uses this. */
  simulatedData: LatestData;
  models: Model[];
  totals: Totals | undefined;
  baselineCo2: Range | undefined;
  lang: Lang;
  accountingMethod: AccountingMethod;
  greenShiftPercent: number;
  setGreenShiftPercent: (n: number) => void;
  isScenario: boolean;
  sample: boolean;
  setInspectModel: (m: Model | null) => void;
}

export function usePageData(): PageContext {
  return useOutletContext<PageContext>();
}
