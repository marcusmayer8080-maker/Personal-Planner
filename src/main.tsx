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
  useEffect(() => {
    void useAuth.getState().refresh();
  }, []);
  // Keyed by user so switching accounts always starts from a clean slate.
  return user ? <App key={user.id} /> : <AuthScreen />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

registerSW({ immediate: true });
