import type { Ymd } from '../lib/dates';

// Flat, normalized records — each maps 1:1 to a future database table.
// Ownership/sharing columns (owner_id, created_by) will be added with auth in phase 2.

export type FlatCategoryKey = 'actions' | 'sport' | 'fun' | 'social' | 'study' | 'spirit';
export type CategoryKey = FlatCategoryKey | 'projects';

export interface Project {
  id: string;
  title: string;
  createdAt: string;
}

export interface Task {
  id: string;
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
  date: Ymd;
  /** `HH:MM`, or empty for all-day. */
  time: string;
  title: string;
  createdAt: string;
}
