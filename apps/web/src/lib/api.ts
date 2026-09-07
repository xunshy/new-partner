export class ApiError extends Error {
  constructor(message: string, public status: number, public nextAllowedAt?: string) { super(message); }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers }, signal: AbortSignal.timeout(15_000) });
  const body = await response.text();
  let data: any;
  // 服务端崩溃时平台会返回 HTML／纯文本错误页，直接 json() 会抛出难懂的解析错误。
  try { data = JSON.parse(body); }
  catch { throw new ApiError(response.ok ? '服务返回了无法识别的内容' : `服务暂时不可用（${response.status}）`, response.status); }
  if (!response.ok) throw new ApiError([data.error, data.detail].filter(Boolean).join('：') || '请求失败，请稍后再试', response.status, data.nextAllowedAt);
  return data as T;
}
