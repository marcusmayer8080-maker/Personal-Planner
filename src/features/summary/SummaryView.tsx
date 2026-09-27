import { useMemo } from 'react';
import { buildAgenda, dateRangeFor, SUMMARY_VIEWS, type AgendaKind } from '../../domain/summary';
import { faNum, jalaaliOf, parseYmd, persianWeekdayIndex, WEEKDAY_FULL } from '../../lib/dates';
import { usePlanner } from '../../store/plannerStore';
import { useUi } from '../../store/uiStore';

const KIND_LABEL: Record<AgendaKind, string> = { event: 'قرار', task: 'کار پروژه', category: 'کار' };

export function SummaryView() {
  const { summaryView, setSummaryView } = useUi();
  const tasks = usePlanner((s) => s.tasks);
  const projects = usePlanner((s) => s.projects);
  const events = usePlanner((s) => s.events);

  const items = useMemo(
    () => buildAgenda(tasks, projects, events, dateRangeFor(summaryView)),
    [tasks, projects, events, summaryView],
  );

  return (
    <>
      <div className="pill-row">
        {SUMMARY_VIEWS.map((v) => (
          <button key={v.key} className={`pill${v.key === summaryView ? ' active' : ''}`} onClick={() => setSummaryView(v.key)}>
            {v.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="empty-note">برای این بازه چیزی ثبت نکردی</div>
      ) : (
        items.map((it) => {
          const j = jalaaliOf(it.date);
          const weekday = WEEKDAY_FULL[persianWeekdayIndex(parseYmd(it.date).getDay())]!;
          return (
            <div key={`${it.kind}-${it.id}`} className="week-row">
              <div className="week-date">
                <span className="d">{faNum(j.jd)}</span>
                <span className="w">{weekday.slice(0, 3)}</span>
              </div>
              <div className="week-body">
                <div className="t">{it.title}</div>
                <div className="meta">{it.meta}</div>
              </div>
              <span className={`kind-badge ${it.kind}`}>{KIND_LABEL[it.kind]}</span>
            </div>
          );
        })
      )}
    </>
  );
}
