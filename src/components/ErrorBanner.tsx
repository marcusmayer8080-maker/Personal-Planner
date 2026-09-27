import { usePlanner } from '../store/plannerStore';

export function ErrorBanner() {
  const error = usePlanner((s) => s.error);
  const dismiss = usePlanner((s) => s.dismissError);
  if (!error) return null;
  return (
    <div className="error-banner" role="alert">
      <span>{error}</span>
      <button className="icon-btn" aria-label="بستن" onClick={dismiss}>✕</button>
    </div>
  );
}
