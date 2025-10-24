import type { HTMLAttributes } from "react";
import React from "react";

import styles from "./card.module.css";

import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement>;

type CardSectionProps<T> = T & {
  className?: string;
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn(styles.card, className)} {...props} />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, CardSectionProps<CardProps>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(styles.cardHeader, className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  CardSectionProps<HTMLAttributes<HTMLHeadingElement>>
>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn(styles.cardTitle, className)} {...props} />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  CardSectionProps<HTMLAttributes<HTMLParagraphElement>>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn(styles.cardDescription, className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, CardSectionProps<CardProps>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(styles.cardContent, className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, CardSectionProps<CardProps>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(styles.cardFooter, className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
