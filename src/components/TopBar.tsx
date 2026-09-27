import { categoryByKey } from '../domain/categories';
import { usePlanner } from '../store/plannerStore';
import { useUi, type MainTab } from '../store/uiStore';

export const TAB_TITLES: Record<MainTab, string> = { summary: 'نماها', categories: 'ثبت کارهام', calendar: 'تقویم' };

interface Stat { num: number; lbl: string; remaining?: boolean }

function useStats(): Stat[] {
  const { mainTab, activeCategory } = useUi();
  const { tasks, projects, events } = usePlanner();

  if (mainTab === 'calendar') return [{ num: events.length, lbl: 'رویداد' }];
  if (mainTab !== 'categories') return [];

  if (categoryByKey(activeCategory).kind === 'flat') {
    const open = tasks.filter((t) => t.category === activeCategory && !t.done).length;
    return [{ num: open, lbl: 'باز', remaining: true }];
  }
  const projectTasks = tasks.filter((t) => t.category === 'projects');
  return [
    { num: projects.length, lbl: 'پروژه' },
    { num: projectTasks.filter((t) => !t.done).length, lbl: 'کار مانده', remaining: true },
  ];
}

export function TopBar() {
  const mainTab = useUi((s) => s.mainTab);
  const stats = useStats();
  return (
    <div className="topbar">
      <h1>{TAB_TITLES[mainTab]}</h1>
      <div className="summary">
        {stats.map((s) => (
          <div key={s.lbl} className={`stat${s.remaining ? ' remaining' : ''}`}>
            <span className="num">{s.num}</span>
            <span className="lbl">{s.lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
