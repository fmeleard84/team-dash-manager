import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  noPadding?: boolean;
}

export function Card({ 
  children, 
  className,
  hover = false,
  noPadding = false,
  ...props 
}: CardProps) {
  return (
    <div 
      className={cn(
        "bg-card rounded-2xl border border-border shadow-md",
        hover && "transition-shadow duration-200 hover:shadow-lg",
        !noPadding && "p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <div className={cn("pb-4", className)} {...props}>
      {children}
    </div>
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function CardTitle({ 
  children, 
  className,
  as: Component = 'h3',
  ...props 
}: CardTitleProps) {
  return (
    <Component 
      className={cn("text-lg font-semibold text-fg", className)} 
      {...props}
    >
      {children}
    </Component>
  );
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function CardDescription({ 
  children, 
  className,
  ...props 
}: CardDescriptionProps) {
  return (
    <p className={cn("text-sm text-fg/70 mt-1", className)} {...props}>
      {children}
    </p>
  );
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardFooter({ children, className, ...props }: CardFooterProps) {
  return (
    <div className={cn("pt-4 mt-4 border-t border-border", className)} {...props}>
      {children}
    </div>
  );
}