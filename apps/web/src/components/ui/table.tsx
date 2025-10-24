'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

type TableProps = React.TableHTMLAttributes<HTMLTableElement>;
type TableHeaderProps = React.HTMLAttributes<HTMLTableSectionElement>;
type TableBodyProps = React.HTMLAttributes<HTMLTableSectionElement>;
type TableRowProps = React.HTMLAttributes<HTMLTableRowElement>;
type TableHeadProps = React.ThHTMLAttributes<HTMLTableCellElement>;
type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement>;
type TableCaptionProps = React.HTMLAttributes<HTMLTableCaptionElement>;

export const Table = ({ className, ...props }: TableProps) => (
  <table className={cn('w-full text-sm text-left', className)} {...props} />
);

export const TableHeader = ({ className, ...props }: TableHeaderProps) => (
  <thead className={cn('bg-muted text-xs uppercase text-muted-foreground', className)} {...props} />
);

export const TableBody = ({ className, ...props }: TableBodyProps) => (
  <tbody className={cn(className)} {...props} />
);

export const TableRow = ({ className, ...props }: TableRowProps) => (
  <tr className={cn('border-b hover:bg-accent', className)} {...props} />
);

export const TableHead = ({ className, ...props }: TableHeadProps) => (
  <th className={cn('px-4 py-3 text-left font-semibold text-muted-foreground', className)} {...props} />
);

export const TableCell = ({ className, ...props }: TableCellProps) => (
  <td className={cn('px-4 py-3 align-middle', className)} {...props} />
);

export const TableCaption = ({ className, ...props }: TableCaptionProps) => (
  <caption className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
);
