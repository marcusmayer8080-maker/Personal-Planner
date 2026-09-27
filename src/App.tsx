import { TAB_TITLES, TopBar } from './components/TopBar';
import { CalendarView } from './features/calendar/CalendarView';
import { CategoriesView } from './features/categories/CategoriesView';
import { SummaryView } from './features/summary/SummaryView';
import { useUi, type MainTab } from './store/uiStore';

const TABS: { key: MainTab; icon: string }[] = [
  { key: 'summary', icon: '📋' },
  { key: 'categories', icon: '🗂️' },
  { key: 'calendar', icon: '📅' },
];

export function App() {
  const { mainTab, setMainTab } = useUi();

  return (
    <div className="app">
      <TopBar />
      <nav className="top-nav">
        {TABS.map((t) => (
          <button key={t.key} className={t.key === mainTab ? 'active' : ''} onClick={() => setMainTab(t.key)}>
            <span className="ic">{t.icon}</span>
            {TAB_TITLES[t.key]}
          </button>
        ))}
      </nav>
      <main>
        {mainTab === 'summary' && <SummaryView />}
        {mainTab === 'categories' && <CategoriesView />}
        {mainTab === 'calendar' && <CalendarView />}
      </main>
    </div>
  );
}
