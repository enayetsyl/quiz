'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

type SeparatorProps = React.HTMLAttributes<HTMLDivElement>;

export const Separator = ({ className, ...props }: SeparatorProps) => (
  <div className={cn('border-t w-full', className)} {...props} />
);
