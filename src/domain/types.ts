import type { Ymd } from '../lib/dates';

// Client-side shapes of the backend collections (backend/pb_migrations).

export type FlatCategoryKey = 'actions' | 'sport' | 'fun' | 'social' | 'study' | 'spirit';
export type CategoryKey = FlatCategoryKey | 'projects';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Project {
  id: string;
  owner: string;
  title: string;
  createdAt: string;
}

export interface Task {
  id: string;
  owner: string;
  text: string;
  done: boolean;
  due: Ymd | null;
  category: CategoryKey;
  /** Set only when category === 'projects'. */
  projectId: string | null;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  owner: string;
  date: Ymd;
  /** `HH:MM`, or empty for all-day. */
  time: string;
  title: string;
  createdAt: string;
}
