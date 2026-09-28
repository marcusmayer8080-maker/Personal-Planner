import { create } from 'zustand';
import type { User } from '../domain/types';
import { api, HttpError } from '../lib/http';

// The session itself is an HttpOnly cookie the page can't read. We keep the last known
// user in localStorage only as a hint, so the app can open immediately (and offline)
// while /api/auth/me confirms the session in the background.

const HINT_KEY = 'planner-user';

function readHint(): User | null {
  try {
    return JSON.parse(localStorage.getItem(HINT_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function writeHint(user: User | null) {
  try {
    if (user) localStorage.setItem(HINT_KEY, JSON.stringify(user));
    else localStorage.removeItem(HINT_KEY);
  } catch {
    // storage unavailable — the hint is optional
  }
}

interface AuthState {
  user: User | null;
  /** True until the first /me check finishes (only matters when there's no hint). */
  checking: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Called when any request comes back 401. */
  sessionExpired: () => void;
}

export const useAuth = create<AuthState>()((set) => {
  const setUser = (user: User | null) => {
    writeHint(user);
    set({ user, checking: false });
  };

  return {
    user: readHint(),
    checking: true,

    signIn: async (email, password) => setUser(await api<User>('POST', '/auth/login', { email, password })),
    signUp: async (name, email, password) => setUser(await api<User>('POST', '/auth/signup', { name, email, password })),
    signOut: async () => {
      setUser(null);
      await api('POST', '/auth/logout').catch(() => {});
    },
    refresh: async () => {
      try {
        setUser(await api<User>('GET', '/auth/me'));
      } catch (err) {
        // Offline: keep the hinted user. Anything else (401): signed out.
        if (err instanceof HttpError && err.status === 0) set({ checking: false });
        else setUser(null);
      }
    },
    sessionExpired: () => setUser(null),
  };
});
