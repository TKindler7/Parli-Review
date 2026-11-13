import type { Feedback, Ballot } from './debate';
export type AIPath = 'transcribe' | 'analyze' | 'judge' | 'followup';
export interface AIResponse {
  segments: { start: number; end: number; text: string; speaker: string }[];
  feedback: Feedback; ballot: Ballot; answer: string; citations: string[];
}
export async function requestAI(path: AIPath, body: unknown, options: {
  key: string; direct: boolean; origin: string; signal?: AbortSignal;
}): Promise<AIResponse> {
  options.signal?.throwIfAborted();
  const init = { method: 'POST', headers: { 'x-openai-key': options.key, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) },
    body: body instanceof FormData ? body : JSON.stringify(body), signal: options.signal };
  let response: Response;
  if (options.direct) {
    const adapter = await import('./ai-server.ts'); options.signal?.throwIfAborted();
    response = await adapter[path](new Request(new URL('/api/' + path, options.origin), init));
  } else response = await fetch(new URL('/api/' + path, options.origin), init);
  options.signal?.throwIfAborted();
  let data: AIResponse & { error?: string };
  try { data = await response.json(); }
  catch { throw new Error('The AI service returned an unreadable response. Your saved round is safe; try again.'); }
  if (!response.ok) throw new Error(data.error || 'Request failed. Please retry.');
  return data;
}
