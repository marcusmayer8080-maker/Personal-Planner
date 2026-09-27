import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CalendarEvent, CategoryKey, Project, Task } from '../domain/types';
import { todayYmd } from '../lib/dates';
import { uid } from '../lib/id';

// All data mutations go through this store. In phase 2 the actions become API calls
// and the components that use them stay unchanged.

interface PlannerData {
  projects: Project[];
  tasks: Task[];
  events: CalendarEvent[];
}

interface PlannerActions {
  addTask: (category: CategoryKey, text: string, projectId?: string) => void;
  updateTask: (id: string, patch: Partial<Pick<Task, 'text' | 'done' | 'due'>>) => void;
  deleteTask: (id: string) => void;
  addProject: (title: string) => void;
  renameProject: (id: string, title: string) => void;
  deleteProject: (id: string) => void;
  addEvent: (ev: Pick<CalendarEvent, 'date' | 'time' | 'title'>) => void;
  updateEvent: (id: string, patch: Partial<Pick<CalendarEvent, 'time' | 'title'>>) => void;
  deleteEvent: (id: string) => void;
}

const now = () => new Date().toISOString();

function newTask(category: CategoryKey, text: string, projectId: string | null = null, extra: Partial<Task> = {}): Task {
  return { id: uid(), text, done: false, due: null, category, projectId, createdAt: now(), ...extra };
}

function seed(): PlannerData {
  const p1: Project = { id: uid(), title: 'وب‌سایت فروشگاه', createdAt: now() };
  const p2: Project = { id: uid(), title: 'اپلیکیشن مدیریت انبار', createdAt: now() };
  return {
    projects: [p1, p2],
    tasks: [
      newTask('actions', 'تماس با حسابدار', null, { due: todayYmd() }),
      newTask('sport', '۳۰ دقیقه پیاده‌روی'),
      newTask('projects', 'اتصال درگاه پرداخت', p1.id),
      newTask('projects', 'صفحه‌ی پیگیری سفارش', p1.id),
      newTask('projects', 'تست ریسپانسیو موبایل', p1.id, { done: true }),
      newTask('projects', 'گزارش خروجی اکسل', p2.id),
      newTask('projects', 'اصلاح باگ جستجو', p2.id),
    ],
    events: [{ id: uid(), date: todayYmd(), time: '', title: 'جلسه هماهنگی تیم', createdAt: now() }],
  };
}

export const usePlanner = create<PlannerData & PlannerActions>()(
  persist(
    (set) => ({
      ...seed(),

      addTask: (category, text, projectId) =>
        set((s) => ({ tasks: [...s.tasks, newTask(category, text, projectId ?? null)] })),
      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addProject: (title) =>
        set((s) => ({ projects: [...s.projects, { id: uid(), title, createdAt: now() }] })),
      renameProject: (id, title) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, title } : p)) })),
      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          tasks: s.tasks.filter((t) => t.projectId !== id),
        })),

      addEvent: (ev) => set((s) => ({ events: [...s.events, { ...ev, id: uid(), createdAt: now() }] })),
      updateEvent: (id, patch) =>
        set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
    }),
    {
      name: 'planner-data-v4',
      version: 4,
      partialize: ({ projects, tasks, events }) => ({ projects, tasks, events }),
    },
  ),
);
