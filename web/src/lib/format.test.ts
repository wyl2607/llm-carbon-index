import { describe, it, expect, afterEach } from 'vitest';
import {
  nf,
  setDisplayLocale,
  formatTokens,
  formatCO2Parts,
  formatWaterParts,
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
