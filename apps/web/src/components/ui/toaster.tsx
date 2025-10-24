'use client';

import { Toast, ToastClose, ToastDescription, ToastTitle, ToastViewport } from '@/components/ui/toast';
import { toast as toastActions, useToast } from '@/components/ui/use-toast';

import styles from './toast.module.css';

export const Toaster = () => {
  const { toasts, dismiss } = useToast();

  return (
    <ToastViewport>
      {toasts.map(({ id, title, description, variant }) => (
        <Toast key={id} variant={variant} data-toast-id={id}>
          <div className={styles.content}>
            {title ? <ToastTitle>{title}</ToastTitle> : null}
            {description ? <ToastDescription>{description}</ToastDescription> : null}
          </div>
          <ToastClose aria-label="Dismiss" onClick={() => dismiss(id)} />
        </Toast>
      ))}
    </ToastViewport>
  );
};

export const toast = toastActions;
