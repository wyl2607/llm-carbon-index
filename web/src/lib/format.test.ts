import { describe, it, expect, afterEach } from 'vitest';
import {
  nf,
  setDisplayLocale,
  formatTokens,
  formatCO2Parts,
  formatWaterParts,
  pickCO2Unit,
  formatCO2InUnit,
  pickWaterUnit,
  formatWaterInUnit,
  formatCO2Range,
  formatWaterRange,
  formatCO2Per1kGShort,
} from './format';

// Locale defaults to English; restore it after each case so order is irrelevant.
afterEach(() => setDisplayLocale('en'));

describe('display locale follows UI language', () => {
  it('English uses comma thousands / dot decimal', () => {
    setDisplayLocale('en');
    expect(nf(4622.3, { minimumFractionDigits: 1, maximumFractionDigits: 1 })).toBe('4,622.3');
  });

  it('Chinese uses the same comma/dot separators (readable for zh)', () => {
    setDisplayLocale('zh');
    expect(nf(4622.3, { minimumFractionDigits: 1, maximumFractionDigits: 1 })).toBe('4,622.3');
  });

  it('German uses dot thousands / comma decimal', () => {
    setDisplayLocale('de');
    expect(nf(4622.3, { minimumFractionDigits: 1, maximumFractionDigits: 1 })).toBe('4.622,3');
  });

  it('unknown language falls back to English', () => {
    setDisplayLocale('fr');
    expect(nf(1234.5, { minimumFractionDigits: 1, maximumFractionDigits: 1 })).toBe('1,234.5');
  });

  it('formatTokens and formatCO2Range honour the active locale', () => {
    setDisplayLocale('de');
    expect(formatTokens(5_584_900_000_000)).toBe('5,6 T');
    expect(formatCO2Range({ low: 1670e3, mid: 6425e3, high: 25685e3 }))
      .toBe('6.425 t (1.670–25.685 t)');
    setDisplayLocale('en');
    expect(formatTokens(5_584_900_000_000)).toBe('5.6 T');
    expect(formatCO2Range({ low: 1670e3, mid: 6425e3, high: 25685e3 }))
      .toBe('6,425 t (1,670–25,685 t)');
  });
});

describe('formatCO2Parts', () => {
  it('uses kg below the 1000 threshold', () => {
    expect(formatCO2Parts({ low: 100, mid: 500, high: 900 })).toEqual({
      mid: '500',
      range: '100–900',
      unit: 'kg',
    });
  });

  it('switches to tonnes at/above 1000 kg mid, sharing one unit for mid and range', () => {
    setDisplayLocale('de');
    const parts = formatCO2Parts({ low: 1000, mid: 1500, high: 2000 });
    expect(parts.unit).toBe('t');
    expect(parts.mid).toBe('2'); // 1500 kg -> 1.5 t -> rounded to 2 (0 decimals)
    expect(parts.range).toBe('1–2');
  });

  it('formats thousands separators in the active (de) locale', () => {
    setDisplayLocale('de');
    const parts = formatCO2Parts({ low: 1_000_000, mid: 1_500_000, high: 2_000_000 });
    expect(parts.unit).toBe('t');
    expect(parts.mid).toBe('1.500');
    expect(parts.range).toBe('1.000–2.000');
  });
});

describe('formatWaterParts', () => {
  it('uses L below the 1000 threshold', () => {
    expect(formatWaterParts({ low: 10, mid: 50, high: 90 })).toEqual({
      mid: '50',
      range: '10–90',
      unit: 'L',
    });
  });

  it('switches to kL at/above 1000 L mid', () => {
    const parts = formatWaterParts({ low: 1000, mid: 3000, high: 5000 });
    expect(parts.unit).toBe('kL');
    expect(parts.mid).toBe('3');
    expect(parts.range).toBe('1–5');
  });
});

describe('column-consistent units (pickCO2Unit + formatCO2InUnit)', () => {
  it('picks one unit for the whole column from its largest value', () => {
    // Largest mid 77 000 kg -> column is tonnes even though small rows are < 1 t.
    const col = [
      { low: 24e3, mid: 77e3, high: 226e3 },
      { low: 300, mid: 850, high: 2400 },
    ];
    expect(pickCO2Unit(col)).toBe('t');
  });

  it('stays in kg when every value is below the 1000 kg threshold', () => {
    expect(pickCO2Unit([{ low: 100, mid: 500, high: 900 }])).toBe('kg');
  });

  it('renders every row in the chosen unit (no mixed t/kg in a column)', () => {
    // Big row: 0 decimals. Small (<1 t) row: keeps decimals so it is not "0 t".
    expect(formatCO2InUnit({ low: 24e3, mid: 77e3, high: 226e3 }, 't')).toEqual({
      mid: '77',
      range: '24–226',
    });
    expect(formatCO2InUnit({ low: 300, mid: 850, high: 2400 }, 't')).toEqual({
      mid: '0.85',
      range: '0.30–2.40',
    });
  });

  it('uses 1 decimal for single-digit tonnes', () => {
    expect(formatCO2InUnit({ low: 3e3, mid: 5.2e3, high: 8e3 }, 't')).toEqual({
      mid: '5.2',
      range: '3.0–8.0',
    });
  });

  it('handles an empty column without throwing (defaults to kg)', () => {
    expect(pickCO2Unit([])).toBe('kg');
  });
});

describe('column-consistent units (pickWaterUnit + formatWaterInUnit)', () => {
  it('picks kL when the largest value reaches the 1000 L threshold', () => {
    expect(pickWaterUnit([{ low: 500, mid: 6233e3, high: 27832e3 }])).toBe('kL');
    expect(pickWaterUnit([{ low: 10, mid: 50, high: 90 }])).toBe('L');
  });

  it('formats each row in the shared water unit', () => {
    expect(formatWaterInUnit({ low: 1104e3, mid: 6233e3, high: 27832e3 }, 'kL')).toEqual({
      mid: '6,233',
      range: '1,104–27,832',
    });
  });
});

describe('combined range formatters stay consistent with parts', () => {
  it('formatCO2Range composes mid + range with a single unit (de)', () => {
    setDisplayLocale('de');
    expect(formatCO2Range({ low: 100, mid: 500, high: 900 })).toBe('500 kg (100–900 kg)');
    expect(formatCO2Range({ low: 1_000_000, mid: 1_500_000, high: 2_000_000 })).toBe(
      '1.500 t (1.000–2.000 t)',
    );
  });

  it('formatWaterRange returns N/A when range is missing', () => {
    expect(formatWaterRange(undefined)).toBe('N/A');
    setDisplayLocale('de');
    expect(formatWaterRange({ low: 10, mid: 50, high: 90 })).toBe('50 L (10–90 L)');
  });
});

describe('formatCO2Per1kGShort', () => {
  it('shows two decimals and a bare g unit (de comma decimal)', () => {
    setDisplayLocale('de');
    expect(formatCO2Per1kGShort(0.32)).toBe('0,32 g');
    expect(formatCO2Per1kGShort(12)).toBe('12,00 g');
  });
});
