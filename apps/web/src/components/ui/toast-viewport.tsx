'use client';

import { useEffect, useRef, useState } from "react";

import styles from "@/components/ui/toast.module.css";
import { cn } from "@/lib/utils";
import { toast, type ToastMessage } from "@/lib/toast";

const DISMISS_AFTER_MS = 4000;

export const ToastViewport = () => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    return toast.subscribe((message: ToastMessage) => {
      setMessages((current) => [...current, message]);

      const timeoutId = window.setTimeout(() => {
        setMessages((current) => current.filter((item) => item.id !== message.id));
        timers.current.delete(message.id);
      }, DISMISS_AFTER_MS);

      timers.current.set(message.id, timeoutId);
    });
  }, []);

  useEffect(() => {
    return () => {
      timers.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timers.current.clear();
    };
  }, []);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className={styles.viewport} role="status" aria-live="polite">
      {messages.map((item) => (
        <div
          key={item.id}
          className={cn(styles.toast, item.variant === "success" ? styles.success : styles.error)}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
};
