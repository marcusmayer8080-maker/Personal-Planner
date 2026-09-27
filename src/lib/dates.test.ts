import { describe, expect, it } from 'vitest';
import { isLeapJalaaliYear, jalaaliMonthLength, toGregorian, toJalaali } from './jalaali';
import { faDateLabel, faNum, weekRange, ymd } from './dates';

describe('jalaali', () => {
  it('converts known dates both ways', () => {
    expect(toJalaali(2025, 3, 21)).toEqual({ jy: 1404, jm: 1, jd: 1 });
    expect(toJalaali(2026, 9, 27)).toEqual({ jy: 1405, jm: 7, jd: 5 });
    expect(toGregorian(1403, 12, 30)).toEqual({ gy: 2025, gm: 3, gd: 20 });
  });

  it('handles leap years and month lengths', () => {
    expect(isLeapJalaaliYear(1403)).toBe(true);
    expect(isLeapJalaaliYear(1404)).toBe(false);
    expect(jalaaliMonthLength(1403, 12)).toBe(30);
    expect(jalaaliMonthLength(1404, 12)).toBe(29);
    expect(jalaaliMonthLength(1404, 1)).toBe(31);
    expect(jalaaliMonthLength(1404, 7)).toBe(30);
  });

  it('round-trips every day of a year', () => {
    const d = new Date(2026, 0, 1);
    for (let i = 0; i < 366; i++) {
      const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      const g = toGregorian(j.jy, j.jm, j.jd);
      expect(new Date(g.gy, g.gm - 1, g.gd).getTime()).toBe(d.getTime());
      d.setDate(d.getDate() + 1);
    }
  });
});

describe('dates', () => {
  it('formats Persian digits and labels', () => {
    expect(faNum(2026)).toBe('۲۰۲۶');
    expect(faDateLabel('2026-09-27')).toBe('۰۵/۰۷/۰۵');
  });

  it('starts weeks on Saturday', () => {
    const { start, end } = weekRange(0, new Date(2026, 8, 27)); // Sunday
    expect(ymd(start)).toBe('2026-09-26');
    expect(ymd(end)).toBe('2026-10-02');
  });
});
