import type { CategoryKey } from './types';

export interface Category {
  key: CategoryKey;
  title: string;
  short: string;
  icon: string;
  kind: 'flat' | 'projects';
}

export const CATEGORIES: Category[] = [
  { key: 'actions', title: 'کارها', short: 'کارها', icon: '✅', kind: 'flat' },
  { key: 'projects', title: 'پروژه‌ها', short: 'پروژه‌ها', icon: '🗂️', kind: 'projects' },
  { key: 'sport', title: 'ورزش و سلامتی', short: 'ورزش', icon: '🏃', kind: 'flat' },
  { key: 'fun', title: 'تفریح و سرگرمی', short: 'تفریح', icon: '🎮', kind: 'flat' },
  { key: 'social', title: 'دوستا و آشناها', short: 'دوستا', icon: '👥', kind: 'flat' },
  { key: 'study', title: 'کتاب و یادگیری', short: 'مطالعه', icon: '📚', kind: 'flat' },
  { key: 'spirit', title: 'معنویت', short: 'معنویت', icon: '🕊️', kind: 'flat' },
];

export const categoryByKey = (key: CategoryKey) => CATEGORIES.find((c) => c.key === key)!;
