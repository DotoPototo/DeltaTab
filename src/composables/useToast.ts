import { ref } from 'vue';
import { errorMessage } from '@/libs/http';

export type ToastSeverity = 'info' | 'success' | 'warn' | 'error';

export interface ToastMessage {
  id: string;
  severity: ToastSeverity;
  summary: string;
  detail?: string;
  // 0 never auto-dismisses.
  life: number;
  action?: ToastAction;
}

export interface ToastAction {
  label: string;
  run: () => unknown;
}

export interface ToastInput {
  severity?: ToastSeverity;
  summary: string;
  detail?: string;
  life?: number;
  action?: ToastAction;
}

const DEFAULT_LIFE_BY_SEVERITY: Record<ToastSeverity, number> = {
  info: 6000,
  success: 5000,
  warn: 8000,
  error: 10000,
};

const messages = ref<ToastMessage[]>([]);
const timers = new Map<string, { timer?: ReturnType<typeof setTimeout>; due: number; left: number }>();

const dismiss = (id: string) => {
  clearTimeout(timers.get(id)?.timer);
  timers.delete(id);
  messages.value = messages.value.filter((m) => m.id !== id);
};

const schedule = (id: string, ms: number) => timers.set(id, { timer: setTimeout(() => dismiss(id), ms), due: Date.now() + ms, left: ms });

const pause = (id: string) => {
  const entry = timers.get(id);
  if (!entry?.timer) return;
  clearTimeout(entry.timer);
  timers.set(id, { due: 0, left: Math.max(entry.due - Date.now(), 0) });
};

const resume = (id: string) => {
  const entry = timers.get(id);
  if (entry && !entry.timer) schedule(id, Math.max(entry.left, 1500));
};

const add = (input: ToastInput) => {
  const id = crypto.randomUUID();
  const severity = input.severity ?? 'info';
  const life = input.life ?? DEFAULT_LIFE_BY_SEVERITY[severity];
  messages.value = [...messages.value, { ...input, id, severity, life }];
  if (life > 0) schedule(id, life);
  return id;
};

const attempt =
  <A extends unknown[]>(summary: string, run: (...args: A) => unknown) =>
  async (...args: A) => {
    try {
      await run(...args);
    } catch (error) {
      add({ severity: 'error', summary, detail: errorMessage(error) });
    }
  };

const withSeverity = (severity: ToastSeverity) => (summary: string, detail?: string) => add({ severity, summary, detail });

export const useToast = () => ({
  attempt,
  messages,
  add,
  dismiss,
  pause,
  resume,
  info: withSeverity('info'),
  success: withSeverity('success'),
  warn: withSeverity('warn'),
  error: withSeverity('error'),
});
