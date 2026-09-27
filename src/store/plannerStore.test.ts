import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project, Task } from '../domain/types';

const api = vi.hoisted(() => ({
  fetchAll: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));
vi.mock('../data/plannerApi', () => ({ plannerApi: api, subscribeAll: vi.fn(async () => () => {}) }));
vi.mock('../lib/pb', () => ({ pb: { authStore: { record: { id: 'me' } } } }));

const { usePlanner } = await import('./plannerStore');

const offline = () => Promise.reject(Object.assign(new Error('offline'), { status: 0 }));
const flush = () => new Promise((r) => setTimeout(r, 0));

const project: Project = { id: 'p1', owner: 'me', title: 'پروژه', createdAt: '' };
const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id, owner: 'me', text: id, done: false, due: null, category: 'actions', projectId: null, createdAt: '', ...extra,
});

beforeEach(async () => {
  vi.clearAllMocks();
  for (const fn of Object.values(api)) fn.mockResolvedValue({});
  api.fetchAll.mockResolvedValue({ projects: [project], tasks: [task('a'), task('b', { category: 'projects', projectId: 'p1' })], events: [] });
  await usePlanner.getState().start();
});

describe('plannerStore optimistic updates', () => {
  it('shows a new task immediately and keeps it when the server accepts', async () => {
    usePlanner.getState().addTask('sport', 'دویدن');
    expect(usePlanner.getState().tasks.map((t) => t.text)).toContain('دویدن');
    await flush();
    expect(usePlanner.getState().tasks.map((t) => t.text)).toContain('دویدن');
    expect(usePlanner.getState().error).toBeNull();
  });

  it('removes a new task again when the server rejects it', async () => {
    api.createTask.mockImplementationOnce(offline);
    usePlanner.getState().addTask('sport', 'دویدن');
    await flush();
    expect(usePlanner.getState().tasks.map((t) => t.text)).not.toContain('دویدن');
    expect(usePlanner.getState().error).toMatch(/ذخیره نشد/);
  });

  it('reverts only the failed field, keeping other successful edits', async () => {
    api.updateTask.mockImplementationOnce(offline);
    usePlanner.getState().updateTask('a', { done: true }); // fails
    usePlanner.getState().updateTask('a', { text: 'renamed' }); // succeeds
    await flush();
    const a = usePlanner.getState().tasks.find((t) => t.id === 'a')!;
    expect(a).toMatchObject({ done: false, text: 'renamed' });
  });

  it('restores a project and its tasks when deleting fails', async () => {
    api.deleteProject.mockImplementationOnce(offline);
    usePlanner.getState().deleteProject('p1');
    expect(usePlanner.getState().projects).toHaveLength(0);
    expect(usePlanner.getState().tasks.map((t) => t.id)).toEqual(['a']);
    await flush();
    expect(usePlanner.getState().projects.map((p) => p.id)).toEqual(['p1']);
    expect(usePlanner.getState().tasks.map((t) => t.id).sort()).toEqual(['a', 'b']);
  });

  it('ignores failures from a previous session after sign-out', async () => {
    let fail!: () => void;
    api.createTask.mockImplementationOnce(() => new Promise((_, reject) => (fail = () => reject({ status: 0 }))));
    usePlanner.getState().addTask('actions', 'x');
    usePlanner.getState().stop();
    fail();
    await flush();
    expect(usePlanner.getState().error).toBeNull();
  });
});
