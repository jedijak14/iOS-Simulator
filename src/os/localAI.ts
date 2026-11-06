/** On-device AI. Model downloads from MLC/Hugging Face; conversations stay on the device. */
import type { MLCEngineInterface, ChatCompletionMessageParam } from '@mlc-ai/web-llm';

const MODEL = 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC';
export type LocalAIState = { status: 'idle' | 'loading' | 'ready' | 'error'; progress: number; message: string };
let state: LocalAIState = { status: 'idle', progress: 0, message: '' };
let engine: MLCEngineInterface | undefined;
let loading: Promise<void> | undefined;
let busy = false;
let enabled = false;
const listeners = new Set<(value: LocalAIState) => void>();
function publish(next: LocalAIState) { state = next; listeners.forEach((f) => f(next)); }
export function getLocalAIState() { return state; }
export function isLocalAIEnabled() { return enabled && !!engine; }
export function setLocalAIEnabled(value: boolean) { enabled = value && !!engine; }
export function subscribeLocalAI(callback: (value: LocalAIState) => void) { listeners.add(callback); return () => { listeners.delete(callback); }; }
export async function loadLocalAI(): Promise<void> {
  if (engine) return;
  if (loading) return loading;
  if (!('gpu' in navigator)) {
    publish({ status: 'error', progress: 0, message: 'On-device AI requires a browser with WebGPU. Try a supported desktop browser.' });
    throw new Error('WebGPU is unavailable');
  }
  publish({ status: 'loading', progress: 0, message: 'Preparing AI model…' });
  loading = (async () => {
    try {
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
      engine = await CreateMLCEngine(MODEL, { initProgressCallback: (p) => publish({ status: 'loading', progress: Math.max(0, Math.min(1, p.progress)), message: p.text }) });
      publish({ status: 'ready', progress: 1, message: 'On-device AI ready' });
    } catch (error) {
      engine = undefined;
      publish({ status: 'error', progress: 0, message: 'Could not load the AI model. Check WebGPU support, memory and your network connection.' });
      throw error;
    } finally { loading = undefined; }
  })();
  return loading;
}
export async function localAIReply(messages: ChatCompletionMessageParam[], signal: AbortSignal): Promise<string> {
  if (!engine) throw new Error('AI model is not loaded');
  if (busy) throw new Error('AI is busy');
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  busy = true;
  const active = engine;
  const abort = () => active.interruptGenerate();
  signal.addEventListener('abort', abort, { once: true });
  try {
    const result = await active.chat.completions.create({ messages, max_tokens: 120, temperature: 0.8, stream: false });
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    const answer = result.choices[0]?.message.content?.trim();
    if (!answer) throw new Error('AI returned an empty reply');
    return answer.slice(0, 2000);
  } finally { signal.removeEventListener('abort', abort); busy = false; }
}
