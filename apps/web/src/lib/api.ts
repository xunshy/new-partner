export class ApiError extends Error {
  constructor(message: string, public status: number, public nextAllowedAt?: string) { super(message); }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers }, signal: AbortSignal.timeout(15_000) });
  const data = await response.json();
  if (!response.ok) throw new ApiError(data.error || '请求失败，请稍后再试', response.status, data.nextAllowedAt);
  return data as T;
}
