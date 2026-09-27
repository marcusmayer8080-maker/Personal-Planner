import { DueControl } from '../../components/DueControl';
import { InlineText } from '../../components/InlineText';
import type { Task } from '../../domain/types';
import { usePlanner } from '../../store/plannerStore';

/** One open task. `variant` picks the flat-list row or the compact project-card row. */
export function TaskRow({ task, variant }: { task: Task; variant: 'row' | 'compact' }) {
  const updateTask = usePlanner((s) => s.updateTask);
  const deleteTask = usePlanner((s) => s.deleteTask);
  const Tag = variant === 'row' ? 'div' : 'li';

  return (
    <Tag className={variant === 'row' ? 'row' : 'task'}>
      <input type="checkbox" checked={task.done} onChange={(e) => updateTask(task.id, { done: e.target.checked })} />
      <InlineText className="task-text" value={task.text} onCommit={(text) => updateTask(task.id, { text })} />
      <DueControl due={task.due} onChange={(due) => updateTask(task.id, { due })} />
      <button className="del-btn" aria-label={variant === 'row' ? 'حذف' : 'حذف کار'} onClick={() => deleteTask(task.id)}>
        ✕
      </button>
    </Tag>
  );
}
