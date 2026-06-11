/**
 * A tiny dependency-free toast bus. Lives outside React so any module (signaling,
 * webrtc, file transfer) can raise a notice without prop-drilling. The <Toaster/>
 * component subscribes and renders.
 */

export type ToastTone = "info" | "success" | "error" | "accent";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  title: string;
  body?: string;
  tone: ToastTone;
  duration: number; // ms; 0 = sticky until dismissed
  action?: ToastAction;
  createdAt: number;
}

type Listener = (toasts: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();
let seq = 0;

function emit() {
  for (const l of listeners) l(items);
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(items);
  return () => {
    listeners.delete(listener);
  };
}

export function dismissToast(id: string) {
  const next = items.filter((t) => t.id !== id);
  if (next.length !== items.length) {
    items = next;
    emit();
  }
}

export interface ToastOptions {
  body?: string;
  tone?: ToastTone;
  duration?: number;
  action?: ToastAction;
  id?: string;
}

function push(title: string, opts: ToastOptions = {}): string {
  const id = opts.id ?? `t${Date.now().toString(36)}${(seq++).toString(36)}`;
  const item: ToastItem = {
    id,
    title,
    body: opts.body,
    tone: opts.tone ?? "info",
    duration: opts.duration ?? 4200,
    action: opts.action,
    createdAt: Date.now(),
  };
  // replace if same id, else prepend; cap to 5 visible
  items = [item, ...items.filter((t) => t.id !== id)].slice(0, 5);
  emit();
  return id;
}

export const toast = {
  show: push,
  info: (title: string, opts: ToastOptions = {}) => push(title, { ...opts, tone: "info" }),
  success: (title: string, opts: ToastOptions = {}) => push(title, { ...opts, tone: "success" }),
  error: (title: string, opts: ToastOptions = {}) => push(title, { ...opts, tone: "error" }),
  accent: (title: string, opts: ToastOptions = {}) => push(title, { ...opts, tone: "accent" }),
  dismiss: dismissToast,
};
