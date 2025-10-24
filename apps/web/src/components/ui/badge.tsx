'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'success' | 'destructive' | 'outline';
};

const variantClassMap = {
  default: 'bg-secondary text-secondary-foreground',
  success: 'bg-success text-primary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  outline: 'border border-border text-muted-foreground'
} as const;

export const Badge = ({ className, variant = 'default', ...props }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-md px-3 py-1 text-xs font-medium',
      variantClassMap[variant] ?? variantClassMap.default,
      className
    )}
    {...props}
  />
);
