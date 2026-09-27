import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../store/authStore';

export function AccountMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  if (!user) return null;
  const label = user.name || user.email;

  return (
    <div className="account" ref={ref}>
      <button className="account-btn" aria-label="حساب کاربری" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {label.trim().charAt(0).toUpperCase()}
      </button>
      {open && (
        <div className="account-menu">
          <div className="account-name">{user.name}</div>
          <div className="account-email" dir="ltr">{user.email}</div>
          <button className="account-signout" onClick={signOut}>خروج از حساب</button>
        </div>
      )}
    </div>
  );
}
