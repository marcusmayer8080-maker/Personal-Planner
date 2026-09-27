import { useMemo, useState } from 'react';
import { NewEventPopover } from '../../components/AddPopover';
import { InlineText } from '../../components/InlineText';
import type { CalendarEvent } from '../../domain/types';
import { googleCalendarUrl } from '../../lib/gcal';
import { toGregorian, toJalaali } from '../../lib/jalaali';
import { addDays, DOW, faNum, jalaaliOf, MONTHS_FA, parseYmd, persianWeekdayIndex, todayYmd, WEEKDAY_FULL, ymd } from '../../lib/dates';
import { usePlanner } from '../../store/plannerStore';
import { useUi } from '../../store/uiStore';

const CELL_COUNT = 42;

function MonthGrid({ eventsByDate }: { eventsByDate: Map<string, CalendarEvent[]> }) {
  const { calCursor, selectedDate, setSelectedDate } = useUi();
  const today = todayYmd();

  const first = toGregorian(calCursor.jy, calCursor.jm, 1);
  const firstDate = new Date(first.gy, first.gm - 1, first.gd);
  const gridStart = addDays(firstDate, -persianWeekdayIndex(firstDate.getDay()));

  const cells = Array.from({ length: CELL_COUNT }, (_, i) => {
    const d = addDays(gridStart, i);
    const dStr = ymd(d);
    const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const dayEvents = eventsByDate.get(dStr);
    const cls = ['cal-day'];
    if (j.jm !== calCursor.jm || j.jy !== calCursor.jy) cls.push('other-month');
    if (dStr === today) cls.push('today');
    if (dStr === selectedDate) cls.push('selected');
    return (
      <div key={dStr} className={cls.join(' ')} onClick={() => setSelectedDate(dStr)}>
        <span>{faNum(j.jd)}</span>
        {dayEvents && (
          <span className="snippet">
            {dayEvents[0]!.title.split(/\s+/).slice(0, 2).join(' ')}
            {dayEvents.length > 1 && ` +${faNum(dayEvents.length - 1)}`}
          </span>
        )}
      </div>
    );
  });

  return (
    <div className="cal-grid">
      {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
      {cells}
    </div>
  );
}

function EventRow({ ev }: { ev: CalendarEvent }) {
  const updateEvent = usePlanner((s) => s.updateEvent);
  const deleteEvent = usePlanner((s) => s.deleteEvent);
  return (
    <div className="event-row">
      <input type="time" className="ev-time" value={ev.time} onChange={(e) => updateEvent(ev.id, { time: e.target.value })} />
      <InlineText className="ev-title" value={ev.title} onCommit={(title) => updateEvent(ev.id, { title })} />
      <a className="gcal-link" href={googleCalendarUrl(ev)} target="_blank" rel="noopener">گوگل کلندر</a>
      <button className="del-btn visible" aria-label="حذف رویداد" onClick={() => deleteEvent(ev.id)}>✕</button>
    </div>
  );
}

export function CalendarView() {
  const { calCursor, shiftMonth, selectedDate } = useUi();
  const events = usePlanner((s) => s.events);
  const [adding, setAdding] = useState(false);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) map.set(ev.date, [...(map.get(ev.date) ?? []), ev]);
    return map;
  }, [events]);

  const sel = jalaaliOf(selectedDate);
  const dayEvents = (eventsByDate.get(selectedDate) ?? []).slice().sort((a, b) => a.time.localeCompare(b.time));

  return (
    <>
      <div className="cal-nav">
        <button aria-label="ماه قبل" onClick={() => shiftMonth(-1)}>‹</button>
        <span className="cal-label">{MONTHS_FA[calCursor.jm - 1]} {faNum(calCursor.jy)}</span>
        <button aria-label="ماه بعد" onClick={() => shiftMonth(1)}>›</button>
      </div>

      <MonthGrid eventsByDate={eventsByDate} />

      <div className="day-events-title">
        {WEEKDAY_FULL[persianWeekdayIndex(parseYmd(selectedDate).getDay())]}، {faNum(sel.jd)} {MONTHS_FA[sel.jm - 1]}
      </div>
      {dayEvents.length === 0 ? (
        <div className="empty-note compact">این روز رویدادی نداری</div>
      ) : (
        dayEvents.map((ev) => <EventRow key={ev.id} ev={ev} />)
      )}

      <button className="fab" aria-label="افزودن" title="افزودن" onClick={() => setAdding((a) => !a)}>+</button>
      {adding && <NewEventPopover onClose={() => setAdding(false)} />}
    </>
  );
}
