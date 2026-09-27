import { describe, expect, it } from 'vitest';
import { buildAgenda } from './summary';
import type { CalendarEvent, Project, Task } from './types';

const base = { owner: 'u', createdAt: '' };
const range = { start: new Date(2026, 8, 26), end: new Date(2026, 9, 2) };

describe('buildAgenda', () => {
  const projects: Project[] = [{ id: 'p', title: 'پروژه', ...base }];
  const tasks: Task[] = [
    { id: 'a', text: 'کار', done: false, due: '2026-09-27', category: 'actions', projectId: null, ...base },
    { id: 'b', text: 'تمام‌شده', done: true, due: '2026-09-27', category: 'actions', projectId: null, ...base },
    { id: 'c', text: 'بدون تاریخ', done: false, due: null, category: 'sport', projectId: null, ...base },
    { id: 'd', text: 'کار پروژه', done: false, due: '2026-09-27', category: 'projects', projectId: 'p', ...base },
    { id: 'e', text: 'خارج از بازه', done: false, due: '2026-10-10', category: 'actions', projectId: null, ...base },
  ];
  const events: CalendarEvent[] = [
    { id: 'x', date: '2026-09-27', time: '', title: 'تمام‌روز', ...base },
    { id: 'y', date: '2026-09-27', time: '09:00', title: 'صبح', ...base },
  ];

  it('keeps open dated items in range, ordered by kind and time', () => {
    const agenda = buildAgenda(tasks, projects, events, range);
    expect(agenda.map((i) => i.id)).toEqual(['y', 'a', 'd', 'x']);
    expect(agenda.find((i) => i.id === 'd')?.meta).toBe('پروژه');
    expect(agenda.find((i) => i.id === 'a')?.meta).toBe('کارها');
  });
});
