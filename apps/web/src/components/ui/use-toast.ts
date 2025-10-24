'use client';

import { useEffect, useState } from 'react';

const TOAST_REMOVE_DELAY = 4000;

export type ToastVariant = 'default' | 'destructive' | 'success';

export type ToastRecord = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastListener = (toasts: ToastRecord[]) => void;

let toasts: ToastRecord[] = [];
const listeners = new Set<ToastListener>();
const removalTimers = new Map<string, ReturnType<typeof setTimeout>>();

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const emit = () => {
  const snapshot = [...toasts];
  listeners.forEach((listener) => listener(snapshot));
};

const scheduleRemoval = (id: string) => {
  const timer = setTimeout(() => {
    removalTimers.delete(id);
    dismiss(id);
  }, TOAST_REMOVE_DELAY);
  removalTimers.set(id, timer);
};

export const dismiss = (id: string) => {
  toasts = toasts.filter((toast) => toast.id !== id);
  const timer = removalTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    removalTimers.delete(id);
  }
  emit();
};

type ToastOptions = Omit<ToastRecord, 'id'>;

type ToastHandle = {
  id: string;
  dismiss: () => void;
};

const showToast = (options: ToastOptions): ToastHandle => {
  const id = createId();
  const toastRecord: ToastRecord = {
    ...options,
    id
  };
  toasts = [...toasts, toastRecord];
  emit();
  scheduleRemoval(id);
  return {
    id,
    dismiss: () => dismiss(id)
  };
};

export const toast = {
  show: (options: ToastOptions) => showToast(options),
  success: (message: string, options?: Omit<ToastOptions, 'description' | 'variant'>) =>
    showToast({ description: message, variant: 'success', ...options }),
  error: (message: string, options?: Omit<ToastOptions, 'description' | 'variant'>) =>
    showToast({ description: message, variant: 'destructive', ...options }),
  dismiss
};

export const useToast = () => {
  const [state, setState] = useState<ToastRecord[]>(toasts);

  useEffect(() => {
    const listener: ToastListener = (next) => setState(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    toasts: state,
    dismiss
  };
};
