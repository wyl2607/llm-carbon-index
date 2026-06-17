import { describe, it, expect, afterEach } from 'vitest';
import { nf, setDisplayLocale, formatCO2Range, formatTokens } from './format';

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
