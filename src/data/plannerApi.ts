import type { CalendarEvent, Project, Task } from '../domain/types';
import { api } from '../lib/http';

// Client for the planner endpoints in server/planner.ts.

export interface PlannerData {
  projects: Project[];
  tasks: Task[];
  events: CalendarEvent[];
}

export const plannerApi = {
  fetchAll: () => api<PlannerData>('GET', '/data'),

  createProject: (p: Project) => api('POST', '/projects', { id: p.id, title: p.title }),
  updateProject: (id: string, patch: Pick<Project, 'title'>) => api('PATCH', `/projects/${id}`, patch),
  deleteProject: (id: string) => api('DELETE', `/projects/${id}`),

  createTask: (t: Task) =>
    api('POST', '/tasks', { id: t.id, text: t.text, category: t.category, projectId: t.projectId, due: t.due, done: t.done }),
  updateTask: (id: string, patch: Partial<Pick<Task, 'text' | 'done' | 'due'>>) => api('PATCH', `/tasks/${id}`, patch),
  deleteTask: (id: string) => api('DELETE', `/tasks/${id}`),

  createEvent: (e: CalendarEvent) => api('POST', '/events', { id: e.id, date: e.date, time: e.time, title: e.title }),
  updateEvent: (id: string, patch: Partial<Pick<CalendarEvent, 'time' | 'title'>>) => api('PATCH', `/events/${id}`, patch),
  deleteEvent: (id: string) => api('DELETE', `/events/${id}`),
};
