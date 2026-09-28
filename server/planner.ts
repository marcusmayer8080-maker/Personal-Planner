import { Hono, type Context } from 'hono';
import { z } from 'zod';
import type { CalendarEvent, CategoryKey, Project, Task } from '../src/domain/types';
import { requireUser } from './auth';
import { nowIso, type AppEnv } from './env';

// Access rule: every statement filters on owner_id = the signed-in user.
// A record id belonging to someone else behaves exactly like a missing one (404).

const id = z.string().regex(/^[a-z0-9]{15}$/);
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hhmm = z.string().regex(/^(\d{2}:\d{2})?$/);
const category = z.enum(['actions', 'projects', 'sport', 'fun', 'social', 'study', 'spirit']);

const projectCreate = z.object({ id, title: z.string().trim().min(1).max(200) });
const projectPatch = z.object({ title: z.string().trim().min(1).max(200) });
const taskCreate = z.object({
  id,
  text: z.string().trim().min(1).max(500),
  category,
  projectId: id.nullable().default(null),
  due: ymd.nullable().default(null),
  done: z.boolean().default(false),
});
const taskPatch = z
  .object({ text: z.string().trim().min(1).max(500), done: z.boolean(), due: ymd.nullable() })
  .partial()
  .refine((p) => Object.keys(p).length > 0);
const eventCreate = z.object({ id, date: ymd, time: hhmm.default(''), title: z.string().trim().min(1).max(300) });
const eventPatch = z
  .object({ time: hhmm, title: z.string().trim().min(1).max(300) })
  .partial()
  .refine((p) => Object.keys(p).length > 0);

interface ProjectRow { id: string; owner_id: string; title: string; created_at: string }
interface TaskRow { id: string; owner_id: string; text: string; done: number; due: string | null; category: string; project_id: string | null; created_at: string }
interface EventRow { id: string; owner_id: string; date: string; time: string; title: string; created_at: string }

const toProject = (r: ProjectRow): Project => ({ id: r.id, owner: r.owner_id, title: r.title, createdAt: r.created_at });
const toTask = (r: TaskRow): Task => ({
  id: r.id, owner: r.owner_id, text: r.text, done: r.done === 1, due: r.due,
  category: r.category as CategoryKey, projectId: r.project_id, createdAt: r.created_at,
});
const toEvent = (r: EventRow): CalendarEvent => ({ id: r.id, owner: r.owner_id, date: r.date, time: r.time, title: r.title, createdAt: r.created_at });

async function body<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T> | null> {
  const parsed = schema.safeParse(await c.req.json().catch(() => null));
  return parsed.success ? parsed.data : null;
}

const badRequest = (c: Context) => c.json({ error: 'invalid_input' }, 400);
const notFound = (c: Context) => c.json({ error: 'not_found' }, 404);
const isConflict = (err: unknown) => /UNIQUE|PRIMARY KEY/.test(String(err));

async function ownsProject(db: D1Database, projectId: string, userId: string) {
  return !!(await db.prepare('SELECT 1 FROM projects WHERE id = ? AND owner_id = ?').bind(projectId, userId).first());
}

/** UPDATE ... SET only the given columns, scoped to the owner. Returns false if no row matched. */
async function updateOwned(db: D1Database, table: string, rowId: string, userId: string, columns: Record<string, unknown>) {
  const names = Object.keys(columns);
  const sql = `UPDATE ${table} SET ${names.map((n) => `${n} = ?`).join(', ')}, updated_at = ? WHERE id = ? AND owner_id = ?`;
  const res = await db.prepare(sql).bind(...Object.values(columns), nowIso(), rowId, userId).run();
  return res.meta.changes > 0;
}

async function deleteOwned(db: D1Database, table: string, rowId: string, userId: string) {
  const res = await db.prepare(`DELETE FROM ${table} WHERE id = ? AND owner_id = ?`).bind(rowId, userId).run();
  return res.meta.changes > 0;
}

export const planner = new Hono<AppEnv>()
  .use(requireUser)

  .get('/data', async (c) => {
    const db = c.env.DB;
    const uid = c.var.user.id;
    const [projects, tasks, events] = await db.batch([
      db.prepare('SELECT * FROM projects WHERE owner_id = ? ORDER BY created_at, rowid').bind(uid),
      db.prepare('SELECT * FROM tasks WHERE owner_id = ? ORDER BY created_at, rowid').bind(uid),
      db.prepare('SELECT * FROM events WHERE owner_id = ? ORDER BY created_at, rowid').bind(uid),
    ]);
    return c.json({
      projects: (projects!.results as ProjectRow[]).map(toProject),
      tasks: (tasks!.results as TaskRow[]).map(toTask),
      events: (events!.results as EventRow[]).map(toEvent),
    });
  })

  // --- projects ---
  .post('/projects', async (c) => {
    const p = await body(c, projectCreate);
    if (!p) return badRequest(c);
    const now = nowIso();
    try {
      await c.env.DB.prepare('INSERT INTO projects (id, owner_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .bind(p.id, c.var.user.id, p.title, now, now)
        .run();
    } catch (err) {
      if (isConflict(err)) return c.json({ error: 'conflict' }, 409);
      throw err;
    }
    return c.json(toProject({ id: p.id, owner_id: c.var.user.id, title: p.title, created_at: now }), 201);
  })
  .patch('/projects/:id', async (c) => {
    const p = await body(c, projectPatch);
    if (!p) return badRequest(c);
    return (await updateOwned(c.env.DB, 'projects', c.req.param('id'), c.var.user.id, { title: p.title })) ? c.body(null, 204) : notFound(c);
  })
  // Tasks of the project go with it (ON DELETE CASCADE).
  .delete('/projects/:id', async (c) =>
    (await deleteOwned(c.env.DB, 'projects', c.req.param('id'), c.var.user.id)) ? c.body(null, 204) : notFound(c),
  )

  // --- tasks ---
  .post('/tasks', async (c) => {
    const t = await body(c, taskCreate);
    if (!t) return badRequest(c);
    const uid = c.var.user.id;
    // Project tasks need a project the user owns; other categories must not reference one.
    if (t.category === 'projects') {
      if (!t.projectId || !(await ownsProject(c.env.DB, t.projectId, uid))) return badRequest(c);
    } else if (t.projectId) {
      return badRequest(c);
    }
    const now = nowIso();
    try {
      await c.env.DB.prepare(
        'INSERT INTO tasks (id, owner_id, text, done, due, category, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(t.id, uid, t.text, t.done ? 1 : 0, t.due, t.category, t.projectId, now, now)
        .run();
    } catch (err) {
      if (isConflict(err)) return c.json({ error: 'conflict' }, 409);
      throw err;
    }
    return c.json(
      toTask({ id: t.id, owner_id: uid, text: t.text, done: t.done ? 1 : 0, due: t.due, category: t.category, project_id: t.projectId, created_at: now }),
      201,
    );
  })
  .patch('/tasks/:id', async (c) => {
    const p = await body(c, taskPatch);
    if (!p) return badRequest(c);
    const columns: Record<string, unknown> = {};
    if (p.text !== undefined) columns.text = p.text;
    if (p.done !== undefined) columns.done = p.done ? 1 : 0;
    if (p.due !== undefined) columns.due = p.due;
    return (await updateOwned(c.env.DB, 'tasks', c.req.param('id'), c.var.user.id, columns)) ? c.body(null, 204) : notFound(c);
  })
  .delete('/tasks/:id', async (c) =>
    (await deleteOwned(c.env.DB, 'tasks', c.req.param('id'), c.var.user.id)) ? c.body(null, 204) : notFound(c),
  )

  // --- events ---
  .post('/events', async (c) => {
    const e = await body(c, eventCreate);
    if (!e) return badRequest(c);
    const now = nowIso();
    try {
      await c.env.DB.prepare('INSERT INTO events (id, owner_id, date, time, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(e.id, c.var.user.id, e.date, e.time, e.title, now, now)
        .run();
    } catch (err) {
      if (isConflict(err)) return c.json({ error: 'conflict' }, 409);
      throw err;
    }
    return c.json(toEvent({ id: e.id, owner_id: c.var.user.id, date: e.date, time: e.time, title: e.title, created_at: now }), 201);
  })
  .patch('/events/:id', async (c) => {
    const p = await body(c, eventPatch);
    if (!p) return badRequest(c);
    return (await updateOwned(c.env.DB, 'events', c.req.param('id'), c.var.user.id, p)) ? c.body(null, 204) : notFound(c);
  })
  .delete('/events/:id', async (c) =>
    (await deleteOwned(c.env.DB, 'events', c.req.param('id'), c.var.user.id)) ? c.body(null, 204) : notFound(c),
  );
