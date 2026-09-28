import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
// Self-hosted font: Google Fonts is unreliable for users in Iran.
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/700.css';
import '@fontsource/vazirmatn/800.css';
import './styles/global.css';
import { App } from './App';
import { AuthScreen } from './features/auth/AuthScreen';
import { useAuth } from './store/authStore';

function Root() {
  const user = useAuth((s) => s.user);
  const checking = useAuth((s) => s.checking);
  useEffect(() => {
    void useAuth.getState().refresh();
  }, []);

  if (user) return <App key={user.id} />; // keyed so switching accounts starts clean
  if (checking) return <div className="empty-note">در حال بارگذاری…</div>;
  return <AuthScreen />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

registerSW({ immediate: true });
