import React from 'react';
import { LucideIcon, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/components/Button';

interface PageHeaderAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  actions?: PageHeaderAction[];
  className?: string;
}

export function PageHeader({ 
  icon: Icon = Settings,
  title, 
  subtitle,
  action,
  actions, 
  className 
}: PageHeaderProps) {
  return (
    <div className={cn("px-8 py-6 border-b border-border dark:border-dark-border bg-bg-secondary dark:bg-dark-bg-secondary", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-brand to-brand/80 rounded-xl flex items-center justify-center shadow-md">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-fg-primary dark:text-dark-fg-primary">{title}</h1>
            {subtitle && (
              <p className="text-sm text-fg-secondary dark:text-dark-fg-secondary mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        
        {(action || actions) && (
          <div className="flex items-center gap-2">
            {action}
            {actions?.map((actionItem, index) => {
              const ActionIcon = actionItem.icon;
              return (
                <Button
                  key={index}
                  variant={actionItem.variant || 'outline'}
                  onClick={actionItem.onClick}
                  className="flex items-center gap-2"
                >
                  {ActionIcon && <ActionIcon className="w-4 h-4" />}
                  {actionItem.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}