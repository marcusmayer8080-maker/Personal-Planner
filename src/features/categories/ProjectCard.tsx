import { useState, type FormEvent } from 'react';
import { InlineText } from '../../components/InlineText';
import type { Project, Task } from '../../domain/types';
import { usePlanner } from '../../store/plannerStore';
import { TaskRow } from './TaskRow';

export function ProjectCard({ project, tasks }: { project: Project; tasks: Task[] }) {
  const renameProject = usePlanner((s) => s.renameProject);
  const deleteProject = usePlanner((s) => s.deleteProject);
  const addTask = usePlanner((s) => s.addTask);
  const [text, setText] = useState('');

  const open = tasks.filter((t) => !t.done);
  const pct = tasks.length ? Math.round((100 * (tasks.length - open.length)) / tasks.length) : 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    addTask('projects', v, project.id);
    setText('');
  };

  return (
    <div className="project">
      <div className="project-head">
        <InlineText className="project-title" value={project.title} onCommit={(title) => renameProject(project.id, title)} />
        <button className="icon-btn" aria-label="حذف پروژه" onClick={() => deleteProject(project.id)}>✕</button>
      </div>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <ul className="tasks">
        {open.map((t) => <TaskRow key={t.id} task={t} variant="compact" />)}
      </ul>
      <form className="add-task" onSubmit={submit}>
        <input type="text" placeholder="یه کار جدید بنویس…" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit">+</button>
      </form>
    </div>
  );
}
