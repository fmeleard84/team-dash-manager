import React from 'react';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}

export function AppShell({ children, sidebar, header, className }: AppShellProps) {
  return (
    <div className={cn("min-h-screen bg-bg", className)}>
      {header && (
        <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
          {header}
        </header>
      )}
      
      <div className="flex h-[calc(100vh-var(--header-height,0px))]">
        {sidebar && (
          <aside className="w-[280px] flex-shrink-0 border-r border-border bg-card">
            {sidebar}
          </aside>
        )}
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}