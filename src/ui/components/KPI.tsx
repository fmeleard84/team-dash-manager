import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPIProps {
  label: string;
  value: string | number;
  delta?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  className?: string;
}

export function KPI({ label, value, delta, icon, className }: KPIProps) {
  const getTrendIcon = () => {
    if (!delta) return null;
    
    switch (delta.trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };
  
  const getTrendColor = () => {
    if (!delta) return '';
    
    switch (delta.trend) {
      case 'up':
        return 'text-success';
      case 'down':
        return 'text-error';
      default:
        return 'text-fg/50';
    }
  };
  
  return (
    <div className={cn("bg-card rounded-2xl border border-border shadow-md p-6", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-fg/70 font-medium">{label}</p>
          <p className="text-2xl font-semibold text-fg mt-2">{value}</p>
          
          {delta && (
            <div className={cn("flex items-center gap-1 mt-2", getTrendColor())}>
              {getTrendIcon()}
              <span className="text-sm font-medium">{delta.value}</span>
            </div>
          )}
        </div>
        
        {icon && (
          <div className="p-2 bg-brand/10 rounded-xl text-brand">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}