import { jalaaliMonthLength, toGregorian, toJalaali, type JalaaliDate } from './jalaali';

/** Calendar dates are stored as local `YYYY-MM-DD` strings. */
export type Ymd = string;

export const two = (n: number) => (n < 10 ? '0' : '') + n;
export const ymd = (d: Date): Ymd => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
export const todayYmd = () => ymd(new Date());
export const parseYmd = (s: Ymd) => new Date(`${s}T00:00:00`);

// Persian week starts Saturday. Index: 0=شنبه ... 6=جمعه
export const DOW = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
export const WEEKDAY_FULL = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
export const MONTHS_FA = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
export const faNum = (n: number | string) => String(n).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]!);

export const persianWeekdayIndex = (jsDay: number) => (jsDay + 1) % 7;

export function jalaaliOf(s: Ymd): JalaaliDate {
  const [y, m, d] = s.split('-').map(Number);
  return toJalaali(y!, m!, d!);
}

export function faDateLabel(s: Ymd) {
  const j = jalaaliOf(s);
  return `${faNum(two(j.jy % 100))}/${faNum(two(j.jm))}/${faNum(two(j.jd))}`;
}

export function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export interface DateRange { start: Date; end: Date }

export function weekRange(offset: number, from = new Date()): DateRange {
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  const start = addDays(today, -persianWeekdayIndex(today.getDay()) + offset * 7);
  return { start, end: addDays(start, 6) };
}

export function jalaaliMonthRange(jy: number, jm: number): DateRange {
  const first = toGregorian(jy, jm, 1);
  const last = toGregorian(jy, jm, jalaaliMonthLength(jy, jm));
  return {
    start: new Date(first.gy, first.gm - 1, first.gd),
    end: new Date(last.gy, last.gm - 1, last.gd),
  };
}
