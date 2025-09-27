import React from 'react';
import { Card, CardContent } from '@/ui/components/card';
import { Badge } from '@/ui/components/badge';
import { ProjectSelectorNeon } from '@/ui/components/project-selector-neon';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderNeonProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    className?: string;
    animate?: boolean;
  };
  projects?: any[];
  selectedProjectId?: string;
  onProjectChange?: (id: string) => void;
  showProjectSelector?: boolean;
  projectSelectorConfig?: {
    placeholder?: string;
    showStatus?: boolean;
    showDates?: boolean;
    showTeamProgress?: boolean;
    className?: string;
  };
  className?: string;
  children?: React.ReactNode;
}

export function PageHeaderNeon({
  icon: Icon,
  title,
  subtitle,
  badge,
  projects = [],
  selectedProjectId,
  onProjectChange,
  showProjectSelector = true,
  projectSelectorConfig = {
    placeholder: "Sélectionner un projet",
    showStatus: true,
    showDates: false,
    showTeamProgress: false,
    className: "w-[280px]"
  },
  className,
  children
}: PageHeaderNeonProps) {
  return (
    <Card className={cn(
      "border-0 p-[1px] rounded-2xl shadow-2xl",
      "bg-gradient-to-br from-purple-200 via-pink-200 to-blue-200",
      "dark:from-purple-600 dark:via-pink-600 dark:to-blue-600",
      "shadow-purple-500/10 dark:shadow-purple-500/25",
      className
    )}>
      <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-[#0f172a] dark:via-[#1e1b4b] dark:to-[#312e81] rounded-2xl">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left side - Icon, Title, Badge, Subtitle */}
            <div className="flex items-start gap-4">
              {/* Animated Icon */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 dark:from-purple-500 dark:to-pink-500 rounded-xl blur-xl opacity-50 dark:opacity-70 animate-pulse" />
                <div className="relative w-12 h-12 bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 dark:from-purple-500 dark:via-pink-500 dark:to-blue-500 rounded-xl flex items-center justify-center shadow-lg dark:shadow-2xl">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              
              {/* Title and subtitle */}
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {title}
                  </h2>
                  {badge && (
                    <Badge 
                      className={cn(
                        "bg-gradient-to-r from-green-400 to-emerald-400 dark:from-green-500 dark:to-emerald-500",
                        "text-white border-0 text-xs px-2 py-0.5",
                        badge.animate && "animate-pulse",
                        badge.className
                      )}
                    >
                      {badge.text}
                    </Badge>
                  )}
                </div>
                {subtitle && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
                )}
              </div>
            </div>
            
            {/* Right side - Project selector or custom content */}
            {showProjectSelector && onProjectChange ? (
              <ProjectSelectorNeon
                projects={projects}
                selectedProjectId={selectedProjectId}
                onProjectChange={onProjectChange}
                placeholder={projectSelectorConfig.placeholder}
                className={projectSelectorConfig.className}
                showStatus={projectSelectorConfig.showStatus}
                showDates={projectSelectorConfig.showDates}
                showTeamProgress={projectSelectorConfig.showTeamProgress}
              />
            ) : children ? (
              <div>{children}</div>
            ) : null}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}