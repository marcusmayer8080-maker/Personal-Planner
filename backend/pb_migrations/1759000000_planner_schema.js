/// <reference path="../pb_data/types.d.ts" />

// Planner schema: projects, tasks, events — each row owned by one user.
// Access is enforced here in API rules, not in the client.
// Phase 3 (sharing) will widen the list/view rules via a `shares` collection.

const OWNER_ONLY = 'owner = @request.auth.id';
const CREATE_AS_SELF = '@request.auth.id != "" && @request.body.owner = @request.auth.id';
// Owner may edit, but never reassign ownership.
const UPDATE_AS_OWNER = OWNER_ONLY + ' && (@request.body.owner:isset = false || @request.body.owner = @request.auth.id)';

const YMD = '^\\d{4}-\\d{2}-\\d{2}$';

function ownerField(usersId) {
  return { name: 'owner', type: 'relation', required: true, collectionId: usersId, maxSelect: 1, cascadeDelete: true };
}

function timestamps() {
  return [
    { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
  ];
}

function ownedRules(extraCreate) {
  return {
    listRule: OWNER_ONLY,
    viewRule: OWNER_ONLY,
    createRule: extraCreate ? CREATE_AS_SELF + ' && ' + extraCreate : CREATE_AS_SELF,
    updateRule: extraCreate ? UPDATE_AS_OWNER + ' && ' + extraCreate : UPDATE_AS_OWNER,
    deleteRule: OWNER_ONLY,
  };
}

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');

    const projects = new Collection({
      type: 'base',
      name: 'projects',
      ...ownedRules(),
      fields: [ownerField(users.id), { name: 'title', type: 'text', required: true, max: 200 }, ...timestamps()],
      indexes: ['CREATE INDEX idx_projects_owner ON projects (owner)'],
    });
    app.save(projects);

    const tasks = new Collection({
      type: 'base',
      name: 'tasks',
      // A task may only point at a project the same user owns.
      ...ownedRules('(project = "" || project.owner = @request.auth.id)'),
      fields: [
        ownerField(users.id),
        { name: 'text', type: 'text', required: true, max: 500 },
        { name: 'done', type: 'bool' },
        { name: 'due', type: 'text', pattern: YMD },
        {
          name: 'category',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['actions', 'projects', 'sport', 'fun', 'social', 'study', 'spirit'],
        },
        { name: 'project', type: 'relation', collectionId: projects.id, maxSelect: 1, cascadeDelete: true },
        ...timestamps(),
      ],
      indexes: ['CREATE INDEX idx_tasks_owner ON tasks (owner)', 'CREATE INDEX idx_tasks_project ON tasks (project)'],
    });
    app.save(tasks);

    const events = new Collection({
      type: 'base',
      name: 'events',
      ...ownedRules(),
      fields: [
        ownerField(users.id),
        { name: 'date', type: 'text', required: true, pattern: YMD },
        { name: 'time', type: 'text', pattern: '^(\\d{2}:\\d{2})?$' },
        { name: 'title', type: 'text', required: true, max: 300 },
        ...timestamps(),
      ],
      indexes: ['CREATE INDEX idx_events_owner_date ON events (owner, date)'],
    });
    app.save(events);
  },
  (app) => {
    for (const name of ['events', 'tasks', 'projects']) {
      app.delete(app.findCollectionByNameOrId(name));
    }
  },
);
