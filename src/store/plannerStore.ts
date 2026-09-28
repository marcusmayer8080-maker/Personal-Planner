import { create } from 'zustand';
import { plannerApi, type PlannerData } from '../data/plannerApi';
import type { CalendarEvent, CategoryKey, Project, Task } from '../domain/types';
import { uid } from '../lib/id';
import { useAuth } from './authStore';

// Server-backed planner data. Mutations are optimistic: the UI updates immediately and
// the request runs in the background. If the server rejects it, that one change is rolled
// back and an error is shown. Changes from other devices arrive by re-fetching every
// REFRESH_MS and whenever the tab regains focus.

const REFRESH_MS = 30_000;

type Status = 'idle' | 'loading' | 'ready' | 'error';

interface PlannerState extends PlannerData {
  status: Status;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  dismissError: () => void;

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

type Key = keyof PlannerData;
type Item<K extends Key> = PlannerData[K][number];

const EMPTY: PlannerData = { projects: [], tasks: [], events: [] };

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i < 0) return [...list, item];
  const next = list.slice();
  next[i] = item;
  return next;
}

function errorMessage(err: unknown) {
  const status = (err as { status?: number })?.status;
  if (status === 0) return 'ارتباط با سرور برقرار نشد. تغییر آخر ذخیره نشد.';
  if (status === 401 || status === 403) return 'دسترسی نداری یا نشستت منقضی شده. دوباره وارد شو.';
  return 'تغییر ذخیره نشد. دوباره امتحان کن.';
}

const ownerId = () => useAuth.getState().user!.id;
const now = () => new Date().toISOString();

let stopRefreshing: (() => void) | null = null;
// Bumped on every start/stop so a slow, superseded request can't install stale data.
let session = 0;
// Mutations still in flight. A background refresh is skipped while any are pending,
// so a response fetched before a save can't make the optimistic change flicker away.
let pending = 0;

export const usePlanner = create<PlannerState>()((set, get) => {
  const list = <K extends Key>(key: K) => get()[key] as Item<K>[];
  const put = <K extends Key>(key: K, items: Item<K>[]) => set({ [key]: items } as Partial<PlannerState>);

  // Optimistic primitives. Each returns its own undo, which touches only the records it changed,
  // so rolling back one failed request never reverts other, successful edits.
  const insert = <K extends Key>(key: K, item: Item<K>) => {
    put(key, [...list(key), item]);
    return () => put(key, list(key).filter((x) => x.id !== item.id));
  };
  const patch = <K extends Key>(key: K, id: string, changes: Partial<Item<K>>) => {
    const before = list(key).find((x) => x.id === id);
    if (!before) return () => {};
    put(key, list(key).map((x) => (x.id === id ? { ...x, ...changes } : x)));
    const reverted = Object.fromEntries(Object.keys(changes).map((k) => [k, before[k as keyof typeof before]]));
    return () => put(key, list(key).map((x) => (x.id === id ? { ...x, ...reverted } : x)));
  };
  const remove = <K extends Key>(key: K, keep: (x: Item<K>) => boolean) => {
    const removed = list(key).filter((x) => !keep(x));
    put(key, list(key).filter(keep));
    return () => put(key, removed.reduce<Item<K>[]>((acc, x) => upsert(acc, x), list(key)));
  };

  /** Run the server call; on failure undo the optimistic change and tell the user. */
  const sync = (request: () => Promise<unknown>, ...undo: (() => void)[]) => {
    const mine = session;
    pending++;
    request()
      .catch((err) => {
        if (mine !== session) return;
        console.error(err);
        undo.reverse().forEach((u) => u());
        if (err?.status === 401) useAuth.getState().sessionExpired();
        else set({ error: errorMessage(err) });
      })
      .finally(() => pending--);
  };

  /** Quietly re-fetch everything; failures are ignored (the next tick retries). */
  const refresh = async () => {
    const mine = session;
    if (pending > 0 || get().status !== 'ready') return;
    try {
      const data = await plannerApi.fetchAll();
      if (mine === session && pending === 0) set(data);
    } catch (err) {
      if (mine === session && (err as { status?: number })?.status === 401) useAuth.getState().sessionExpired();
    }
  };

  function startRefreshing() {
    const onVisible = () => document.visibilityState === 'visible' && void refresh();
    const timer = setInterval(() => document.visibilityState === 'visible' && void refresh(), REFRESH_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }

  return {
    ...EMPTY,
    status: 'idle',
    error: null,

    start: async () => {
      get().stop();
      const mine = session;
      set({ status: 'loading' });
      try {
        const data = await plannerApi.fetchAll();
        if (mine !== session) return;
        set({ ...data, status: 'ready' });
        stopRefreshing = startRefreshing();
      } catch (err) {
        if (mine !== session) return;
        console.error(err);
        if ((err as { status?: number })?.status === 401) return useAuth.getState().sessionExpired();
        // The load-error state in <App> explains this; the banner is for failed edits.
        set({ status: 'error' });
      }
    },
    stop: () => {
      session++;
      stopRefreshing?.();
      stopRefreshing = null;
      set({ ...EMPTY, status: 'idle', error: null });
    },
    dismissError: () => set({ error: null }),

    addTask: (category, text, projectId) => {
      const task: Task = { id: uid(), owner: ownerId(), text, done: false, due: null, category, projectId: projectId ?? null, createdAt: now() };
      sync(() => plannerApi.createTask(task), insert('tasks', task));
    },
    updateTask: (id, changes) => sync(() => plannerApi.updateTask(id, changes), patch('tasks', id, changes)),
    deleteTask: (id) => sync(() => plannerApi.deleteTask(id), remove('tasks', (t) => t.id !== id)),

    addProject: (title) => {
      const project: Project = { id: uid(), owner: ownerId(), title, createdAt: now() };
      sync(() => plannerApi.createProject(project), insert('projects', project));
    },
    renameProject: (id, title) => sync(() => plannerApi.updateProject(id, { title }), patch('projects', id, { title })),
    // The server cascades the delete to the project's tasks.
    deleteProject: (id) =>
      sync(
        () => plannerApi.deleteProject(id),
        remove('projects', (p) => p.id !== id),
        remove('tasks', (t) => t.projectId !== id),
      ),

    addEvent: (ev) => {
      const event: CalendarEvent = { ...ev, id: uid(), owner: ownerId(), createdAt: now() };
      sync(() => plannerApi.createEvent(event), insert('events', event));
    },
    updateEvent: (id, changes) => sync(() => plannerApi.updateEvent(id, changes), patch('events', id, changes)),
    deleteEvent: (id) => sync(() => plannerApi.deleteEvent(id), remove('events', (e) => e.id !== id)),
  };
});
