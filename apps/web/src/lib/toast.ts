export type ToastVariant = "success" | "error";

export type ToastMessage = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastListener = (toast: ToastMessage) => void;

const listeners = new Set<ToastListener>();

const createId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const emit = (variant: ToastVariant, message: string) => {
  const toast: ToastMessage = {
    id: createId(),
    message,
    variant
  };

  listeners.forEach((listener) => listener(toast));
};

export const toast = {
  success: (message: string) => emit("success", message),
  error: (message: string) => emit("error", message),
  subscribe: (listener: ToastListener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
};
