import { two, ymd } from './dates';
import type { CalendarEvent } from '../domain/types';

export function googleCalendarUrl(ev: CalendarEvent) {
  let tz = 'UTC';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    // keep UTC
  }
  let startStr: string;
  let endStr: string;
  if (ev.time) {
    const start = new Date(`${ev.date}T${ev.time}:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    startStr = `${ev.date.replace(/-/g, '')}T${two(start.getHours())}${two(start.getMinutes())}00`;
    endStr = `${ymd(end).replace(/-/g, '')}T${two(end.getHours())}${two(end.getMinutes())}00`;
  } else {
    const end = new Date(new Date(`${ev.date}T00:00:00`).getTime() + 24 * 60 * 60 * 1000);
    startStr = ev.date.replace(/-/g, '');
    endStr = ymd(end).replace(/-/g, '');
  }
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${startStr}/${endStr}&ctz=${encodeURIComponent(tz)}`;
}
