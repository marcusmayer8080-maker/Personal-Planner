import { useState } from 'react';
import { faDateLabel, type Ymd } from '../lib/dates';

interface Props {
  due: Ymd | null;
  onChange: (due: Ymd | null) => void;
}

export function DueControl({ due, onChange }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <span className="due-ctrl">
        <input
          type="date"
          className="due-input"
          defaultValue={due ?? ''}
          ref={(el) => {
            if (!el || document.activeElement === el) return;
            el.focus();
            try {
              el.showPicker?.();
            } catch {
              // showPicker needs a user gesture in some browsers
            }
          }}
          onChange={(e) => {
            onChange(e.target.value || null);
            setEditing(false);
          }}
          onBlur={() => setEditing(false)}
        />
      </span>
    );
  }

  return (
    <span className="due-ctrl">
      {due ? (
        <button type="button" className="due-badge due-badge-btn" aria-label="ویرایش تاریخ" onClick={() => setEditing(true)}>
          {faDateLabel(due)}
        </button>
      ) : (
        <button type="button" className="icon-btn due-add-btn" aria-label="تعیین تاریخ" onClick={() => setEditing(true)}>
          📅
        </button>
      )}
    </span>
  );
}
