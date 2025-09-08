import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({ 
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
  className,
  ...props 
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl'
  };
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  };
  
  return (
    <div
      className={cn(
        'bg-muted',
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={{
        width: width || '100%',
        height: height || (variant === 'text' ? '1em' : '100%')
      }}
      {...props}
    />
  );
}

interface SkeletonCardProps {
  lines?: number;
  showImage?: boolean;
}

export function SkeletonCard({ lines = 3, showImage = false }: SkeletonCardProps) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-md p-6">
      {showImage && (
        <Skeleton variant="rectangular" height={200} className="mb-4" />
      )}
      
      <Skeleton variant="text" width="60%" className="mb-2" />
      
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            variant="text" 
            width={i === lines - 1 ? "80%" : "100%"} 
          />
        ))}
      </div>
    </div>
  );
}

interface SkeletonKPIProps {}

export function SkeletonKPI({}: SkeletonKPIProps) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-md p-6">
      <Skeleton variant="text" width="40%" className="mb-3" />
      <Skeleton variant="text" width="60%" height="2rem" className="mb-2" />
      <Skeleton variant="text" width="30%" />
    </div>
  );
}