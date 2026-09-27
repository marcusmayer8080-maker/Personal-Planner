import { useState, type FormEvent } from 'react';
import { categoryByKey } from '../../domain/categories';
import type { FlatCategoryKey } from '../../domain/types';
import { usePlanner } from '../../store/plannerStore';
import { TaskRow } from './TaskRow';

export function FlatCategoryList({ categoryKey }: { categoryKey: FlatCategoryKey }) {
  const allTasks = usePlanner((s) => s.tasks);
  const addTask = usePlanner((s) => s.addTask);
  const [text, setText] = useState('');
  const open = allTasks.filter((t) => t.category === categoryKey && !t.done);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    addTask(categoryKey, v);
    setText('');
  };

  return (
    <>
      <form className="row add-row" onSubmit={submit}>
        <span className="row-cb-placeholder" />
        <input type="text" className="task-text" placeholder="یه مورد جدید بنویس…" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="icon-btn add-task-btn" aria-label="اضافه کن">+</button>
      </form>

      {open.length === 0 ? (
        <div className="empty-note">چیزی تو «{categoryByKey(categoryKey).title}» نداری، از بالا یکی اضافه کن</div>
      ) : (
        open.map((t) => <TaskRow key={t.id} task={t} variant="row" />)
      )}
    </>
  );
}
