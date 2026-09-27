import { useEffect } from 'react';
import { ErrorBanner } from './components/ErrorBanner';
import { TAB_TITLES, TopBar } from './components/TopBar';
import { CalendarView } from './features/calendar/CalendarView';
import { CategoriesView } from './features/categories/CategoriesView';
import { SummaryView } from './features/summary/SummaryView';
import { usePlanner } from './store/plannerStore';
import { useUi, type MainTab } from './store/uiStore';

const TABS: { key: MainTab; icon: string }[] = [
  { key: 'summary', icon: '📋' },
  { key: 'categories', icon: '🗂️' },
  { key: 'calendar', icon: '📅' },
];

/** The signed-in app. Mounted once per user session. */
export function App() {
  const { mainTab, setMainTab } = useUi();
  const status = usePlanner((s) => s.status);

  useEffect(() => {
    const { start, stop } = usePlanner.getState();
    void start();
    return stop;
  }, []);

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
      <ErrorBanner />
      <main>
        {status === 'loading' || status === 'idle' ? (
          <div className="empty-note">در حال بارگذاری…</div>
        ) : status === 'error' ? (
          <div className="empty-note">
            داده‌ها بارگذاری نشد.{' '}
            <button className="link-btn" onClick={() => void usePlanner.getState().start()}>دوباره تلاش کن</button>
          </div>
        ) : (
          <>
            {mainTab === 'summary' && <SummaryView />}
            {mainTab === 'categories' && <CategoriesView />}
            {mainTab === 'calendar' && <CalendarView />}
          </>
        )}
      </main>
    </div>
  );
}
