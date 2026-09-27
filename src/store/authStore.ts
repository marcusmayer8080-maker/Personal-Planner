import type { RecordModel } from 'pocketbase';
import { create } from 'zustand';
import type { User } from '../domain/types';
import { pb } from '../lib/pb';

// The session token lives in PocketBase's authStore (localStorage); this store mirrors it for React.

const toUser = (r: RecordModel | null): User | null => (r ? { id: r.id, email: r.email, name: r.name } : null);

interface AuthState {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
  /** Validates a stored session with the server on startup. */
  refresh: () => Promise<void>;
}

export const useAuth = create<AuthState>()((set) => {
  pb.authStore.onChange(() => set({ user: toUser(pb.authStore.record) }));

  return {
    user: pb.authStore.isValid ? toUser(pb.authStore.record) : null,

    signIn: async (email, password) => {
      await pb.collection('users').authWithPassword(email, password);
    },
    signUp: async (name, email, password) => {
      await pb.collection('users').create({ name, email, password, passwordConfirm: password });
      await pb.collection('users').authWithPassword(email, password);
    },
    signOut: () => pb.authStore.clear(),
    refresh: async () => {
      if (!pb.authStore.isValid) return;
      try {
        await pb.collection('users').authRefresh();
      } catch (err) {
        // Only drop the session if the server rejected it — not when offline.
        if ((err as { status?: number }).status !== 0) pb.authStore.clear();
      }
    },
  };
});
