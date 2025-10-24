'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import styles from './toast.module.css';
import type { ToastVariant } from './use-toast';

const variantClassMap: Record<ToastVariant, string> = {
  default: '',
  success: styles.toastSuccess,
  destructive: styles.toastDestructive
};

type ToastProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: ToastVariant;
};

type ToastTitleProps = React.HTMLAttributes<HTMLParagraphElement>;

type ToastDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

type ToastCloseProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

type ToastViewportProps = React.HTMLAttributes<HTMLDivElement>;

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(styles.toast, variantClassMap[variant], className)}
      role="status"
      {...props}
    />
  )
);
Toast.displayName = 'Toast';

export const ToastTitle = React.forwardRef<HTMLParagraphElement, ToastTitleProps>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn(styles.title, className)} {...props} />
);
ToastTitle.displayName = 'ToastTitle';

export const ToastDescription = React.forwardRef<HTMLParagraphElement, ToastDescriptionProps>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn(styles.description, className)} {...props} />
);
ToastDescription.displayName = 'ToastDescription';

export const ToastClose = React.forwardRef<HTMLButtonElement, ToastCloseProps>(
  ({ className, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={cn(styles.closeButton, className)} {...props}>
      ×
    </button>
  )
);
ToastClose.displayName = 'ToastClose';

export const ToastViewport = React.forwardRef<HTMLDivElement, ToastViewportProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(styles.viewport, className)} {...props} />
  )
);
ToastViewport.displayName = 'ToastViewport';
