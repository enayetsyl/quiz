'use client';

import type { ButtonHTMLAttributes } from "react";
import React from "react";

import styles from "./button.module.css";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "default" | "sm" | "lg" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClassMap: Record<ButtonVariant, string> = {
  default: styles["variant-default"],
  secondary: styles["variant-secondary"],
  outline: styles["variant-outline"],
  ghost: styles["variant-ghost"],
  destructive: styles["variant-destructive"]
};

const sizeClassMap: Record<ButtonSize, string> = {
  default: styles.button,
  sm: cn(styles.button, styles["size-sm"]),
  lg: cn(styles.button, styles["size-lg"]),
  icon: cn(styles.button, styles["size-icon"])
};

export const buttonVariants = ({
  variant = "default",
  size = "default"
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) => {
  const sizeClass = sizeClassMap[size] ?? styles.button;
  const variantClass = variantClassMap[variant] ?? variantClassMap.default;
  return cn(sizeClass, variantClass);
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", className, ...rest }, ref) => {
    const classes = cn(buttonVariants({ variant, size }), className);
    return <button ref={ref} className={classes} {...rest} />;
  }
);

Button.displayName = "Button";
