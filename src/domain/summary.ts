import type { CalendarEvent, Project, Task } from './types';
import { categoryByKey } from './categories';
import { jalaaliMonthRange, jalaaliOf, parseYmd, todayYmd, weekRange, addDays, type DateRange, type Ymd } from '../lib/dates';
export type SummaryView = 'today' | 'tomorrow' | 'week-current' | 'week-next' | 'month-current';

export const SUMMARY_VIEWS: { key: SummaryView; label: string }[] = [
  { key: 'today', label: 'امروز' },
  { key: 'tomorrow', label: 'فردا' },
  { key: 'week-current', label: 'این هفته' },
  { key: 'week-next', label: 'هفته‌ی بعد' },
  { key: 'month-current', label: 'این ماه' },
];

export type AgendaKind = 'event' | 'task' | 'category';

export interface AgendaItem {
  id: string;
  kind: AgendaKind;
  title: string;
  date: Ymd;
  meta: string;
  sortKey: string;
}

export function dateRangeFor(view: SummaryView, from = new Date()): DateRange {
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  switch (view) {
    case 'today':
      return { start: today, end: today };
    case 'tomorrow': {
      const t = addDays(today, 1);
      return { start: t, end: t };
    }
    case 'week-current':
      return weekRange(0, today);
    case 'week-next':
      return weekRange(1, today);
    case 'month-current': {
      const j = jalaaliOf(todayYmd());
      return jalaaliMonthRange(j.jy, j.jm);
    }
  }
}

/** Open dated tasks plus all events, sorted: events by time, then category tasks, then project tasks. */
export function buildAgenda(tasks: Task[], projects: Project[], events: CalendarEvent[], range: DateRange): AgendaItem[] {
  const projectTitle = new Map(projects.map((p) => [p.id, p.title]));
  const items: AgendaItem[] = [];

  for (const t of tasks) {
    if (t.done || !t.due) continue;
    if (t.category === 'projects') {
      items.push({ id: t.id, kind: 'task', title: t.text, date: t.due, meta: projectTitle.get(t.projectId ?? '') ?? '', sortKey: `${t.due}T60:00` });
    } else {
      items.push({ id: t.id, kind: 'category', title: t.text, date: t.due, meta: categoryByKey(t.category).title, sortKey: `${t.due}T50:00` });
    }
  }
  for (const ev of events) {
    items.push({ id: ev.id, kind: 'event', title: ev.title, date: ev.date, meta: ev.time || 'تمام‌روز', sortKey: `${ev.date}T${ev.time || '99:99'}` });
  }

  return items
    .filter((it) => {
      const d = parseYmd(it.date);
      return d >= range.start && d <= range.end;
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
