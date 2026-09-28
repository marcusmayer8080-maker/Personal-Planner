import type { User } from '../src/domain/types';

export interface Bindings {
  DB: D1Database;
}

export interface Variables {
  user: User;
}

export type AppEnv = { Bindings: Bindings; Variables: Variables };

export const nowIso = () => new Date().toISOString();
