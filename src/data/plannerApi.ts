import type { RecordModel } from 'pocketbase';
import type { CalendarEvent, CategoryKey, Project, Task } from '../domain/types';
import { pb } from '../lib/pb';

// The only module that knows PocketBase record shapes. Maps records <-> domain types.

export const toProject = (r: RecordModel): Project => ({
  id: r.id,
  owner: r.owner,
  title: r.title,
  createdAt: r.created,
});

export const toTask = (r: RecordModel): Task => ({
  id: r.id,
  owner: r.owner,
  text: r.text,
  done: r.done,
  due: r.due || null,
  category: r.category as CategoryKey,
  projectId: r.project || null,
  createdAt: r.created,
});

export const toEvent = (r: RecordModel): CalendarEvent => ({
  id: r.id,
  owner: r.owner,
  date: r.date,
  time: r.time,
  title: r.title,
  createdAt: r.created,
});

type TaskFields = Partial<Pick<Task, 'text' | 'done' | 'due' | 'category' | 'projectId' | 'owner'>>;

function taskBody(t: TaskFields) {
  const body: Record<string, unknown> = {};
  if (t.owner !== undefined) body.owner = t.owner;
  if (t.text !== undefined) body.text = t.text;
  if (t.done !== undefined) body.done = t.done;
  if (t.due !== undefined) body.due = t.due ?? '';
  if (t.category !== undefined) body.category = t.category;
  if (t.projectId !== undefined) body.project = t.projectId ?? '';
  return body;
}

export const plannerApi = {
  async fetchAll() {
    const opts = { sort: 'created' };
    const [projects, tasks, events] = await Promise.all([
      pb.collection('projects').getFullList(opts),
      pb.collection('tasks').getFullList(opts),
      pb.collection('events').getFullList(opts),
    ]);
    return { projects: projects.map(toProject), tasks: tasks.map(toTask), events: events.map(toEvent) };
  },

  createProject: (p: Project) => pb.collection('projects').create({ id: p.id, owner: p.owner, title: p.title }),
  updateProject: (id: string, patch: Pick<Project, 'title'>) => pb.collection('projects').update(id, patch),
  deleteProject: (id: string) => pb.collection('projects').delete(id),

  createTask: (t: Task) => pb.collection('tasks').create({ id: t.id, ...taskBody(t) }),
  updateTask: (id: string, patch: TaskFields) => pb.collection('tasks').update(id, taskBody(patch)),
  deleteTask: (id: string) => pb.collection('tasks').delete(id),

  createEvent: (e: CalendarEvent) =>
    pb.collection('events').create({ id: e.id, owner: e.owner, date: e.date, time: e.time, title: e.title }),
  updateEvent: (id: string, patch: Partial<Pick<CalendarEvent, 'time' | 'title'>>) => pb.collection('events').update(id, patch),
  deleteEvent: (id: string) => pb.collection('events').delete(id),
};

export type RealtimeHandler<T> = (action: 'create' | 'update' | 'delete', item: T) => void;

/** Live updates for everything the current user can see. Returns an unsubscribe function. */
export async function subscribeAll(handlers: {
  projects: RealtimeHandler<Project>;
  tasks: RealtimeHandler<Task>;
  events: RealtimeHandler<CalendarEvent>;
}) {
  const unsubs = await Promise.all([
    pb.collection('projects').subscribe('*', (e) => handlers.projects(e.action as never, toProject(e.record))),
    pb.collection('tasks').subscribe('*', (e) => handlers.tasks(e.action as never, toTask(e.record))),
    pb.collection('events').subscribe('*', (e) => handlers.events(e.action as never, toEvent(e.record))),
  ]);
  return () => unsubs.forEach((u) => u());
}
