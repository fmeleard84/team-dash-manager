import React from 'react';
import { cn } from '@/lib/utils';

interface PageSectionProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageSection({ 
  title, 
  description, 
  action, 
  children, 
  className 
}: PageSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-fg">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-fg/70 mt-1">{description}</p>
            )}
          </div>
          {action && (
            <div className="flex items-center gap-2">
              {action}
            </div>
          )}
        </div>
      )}
      
      <div className="grid gap-4">
        {children}
      </div>
    </section>
  );
}