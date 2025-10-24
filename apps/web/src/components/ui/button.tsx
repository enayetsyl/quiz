'use client';

import React from 'react';

import { cn } from '@/lib/utils';

const baseButtonClass =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50';

const variantClassMap = {
  default: 'bg-primary text-primary-foreground shadow hover:bg-primary-hover focus-visible:ring focus-visible:ring-primary',
  destructive:
    'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive-hover focus-visible:ring focus-visible:ring-destructive',
  outline:
    'border border-border bg-card text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:ring focus-visible:ring-border',
  secondary:
    'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary-hover focus-visible:ring focus-visible:ring-secondary',
  ghost: 'hover:bg-accent hover:text-accent-foreground focus-visible:ring focus-visible:ring-accent',
  link: 'text-primary underline underline-offset-4 hover:decoration-2 focus-visible:ring focus-visible:ring-transparent'
} as const;

const sizeClassMap = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3 text-xs',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-10 w-10'
} as const;

export type ButtonVariant = keyof typeof variantClassMap;
export type ButtonSize = keyof typeof sizeClassMap;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
};

export const buttonVariants = ({
  variant = 'default',
  size = 'default',
  className
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) => {
  const variantClasses = variantClassMap[variant] ?? variantClassMap.default;
  const sizeClasses = sizeClassMap[size] ?? sizeClassMap.default;
  return cn(baseButtonClass, variantClasses, sizeClasses, className);
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, children, ...props }, ref) => {
    const composedClassName = buttonVariants({ variant, size, className });

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        className: cn(children.props.className as string | undefined, composedClassName),
        ref,
        ...props
      } as unknown as React.ReactElement['props']);
    }

    return (
      <button ref={ref} className={composedClassName} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
