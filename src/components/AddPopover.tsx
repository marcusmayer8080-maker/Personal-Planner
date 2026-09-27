import { useState, type FormEvent, type ReactNode } from 'react';
import { usePlanner } from '../store/plannerStore';
import { useUi } from '../store/uiStore';

function Popover({ onClose, onSubmit, children }: { onClose: () => void; onSubmit: () => void; children: ReactNode }) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  return (
    <form className="add-popover" onSubmit={handleSubmit} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      {children}
      <button type="submit" className="submit">اضافه کن</button>
    </form>
  );
}

export function NewProjectPopover({ onClose }: { onClose: () => void }) {
  const addProject = usePlanner((s) => s.addProject);
  const [title, setTitle] = useState('');
  return (
    <Popover
      onClose={onClose}
      onSubmit={() => {
        const v = title.trim();
        if (!v) return;
        addProject(v);
        onClose();
      }}
    >
      <input className="grow" autoFocus placeholder="اسم پروژه‌ی جدید…" value={title} onChange={(e) => setTitle(e.target.value)} />
    </Popover>
  );
}

export function NewEventPopover({ onClose }: { onClose: () => void }) {
  const addEvent = usePlanner((s) => s.addEvent);
  const { selectedDate, setSelectedDate } = useUi();
  const [date, setDate] = useState(selectedDate);
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');
  return (
    <Popover
      onClose={onClose}
      onSubmit={() => {
        const v = title.trim();
        if (!v || !date) return;
        addEvent({ date, time, title: v });
        setSelectedDate(date);
        onClose();
      }}
    >
      <input className="date-in" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <input className="time-in" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      <input className="grow" autoFocus placeholder="اسم رویداد…" value={title} onChange={(e) => setTitle(e.target.value)} />
    </Popover>
  );
}
