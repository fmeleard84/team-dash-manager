import React from 'react';
import { cn } from '@/lib/utils';
import { Button as ShadcnButton, ButtonProps as ShadcnButtonProps } from '@/components/ui/button';

export interface ButtonProps extends ShadcnButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const variantClasses = {
  primary: 'bg-brand text-white hover:bg-brand/90 shadow-md',
  secondary: 'bg-muted text-fg hover:bg-muted/80',
  ghost: 'bg-transparent text-fg hover:bg-muted/50',
  destructive: 'bg-error text-white hover:bg-error/90 shadow-md',
  outline: 'border-2 border-border bg-transparent text-fg hover:bg-muted/50'
};

const sizeClasses = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-base',
  lg: 'h-13 px-6 text-lg'
};

export function Button({ 
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  className,
  disabled,
  ...props 
}: ButtonProps) {
  return (
    <ShadcnButton
      className={cn(
        'rounded-2xl font-semibold transition-all duration-200',
        variantClasses[variant],
        sizeClasses[size],
        'inline-flex items-center gap-2',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Chargement...</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </ShadcnButton>
  );
}