/** Error from the API. `status` 0 means the server couldn't be reached. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
  ) {
    super(code ?? `HTTP ${status}`);
  }
}

/** JSON request to our own `/api` (same origin; the session cookie is sent automatically). */
export async function api<T = void>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new HttpError(0);
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new HttpError(res.status, data.error);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}
