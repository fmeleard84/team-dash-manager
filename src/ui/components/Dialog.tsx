import React from 'react';
import {
  Dialog as ShadcnDialog,
  DialogContent as ShadcnDialogContent,
  DialogDescription as ShadcnDialogDescription,
  DialogFooter as ShadcnDialogFooter,
  DialogHeader as ShadcnDialogHeader,
  DialogTitle as ShadcnDialogTitle,
  DialogTrigger as ShadcnDialogTrigger,
} from '@/ui/components/dialog';
import { cn } from '@/lib/utils';

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <ShadcnDialog open={open} onOpenChange={onOpenChange}>
      {children}
    </ShadcnDialog>
  );
}

interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function DialogTrigger({ children, asChild }: DialogTriggerProps) {
  return <ShadcnDialogTrigger asChild={asChild}>{children}</ShadcnDialogTrigger>;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw]'
};

export function DialogContent({ children, className, size = 'md' }: DialogContentProps) {
  return (
    <ShadcnDialogContent 
      className={cn(
        'rounded-2xl shadow-lg',
        sizeClasses[size],
        className
      )}
    >
      {children}
    </ShadcnDialogContent>
  );
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogHeader({ children, className }: DialogHeaderProps) {
  return (
    <ShadcnDialogHeader className={cn('pb-4', className)}>
      {children}
    </ShadcnDialogHeader>
  );
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogTitle({ children, className }: DialogTitleProps) {
  return (
    <ShadcnDialogTitle className={cn('text-xl font-semibold', className)}>
      {children}
    </ShadcnDialogTitle>
  );
}

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogDescription({ children, className }: DialogDescriptionProps) {
  return (
    <ShadcnDialogDescription className={cn('text-sm text-fg/70', className)}>
      {children}
    </ShadcnDialogDescription>
  );
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <ShadcnDialogFooter className={cn('pt-4', className)}>
      {children}
    </ShadcnDialogFooter>
  );
}