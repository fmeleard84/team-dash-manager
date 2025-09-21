import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export const LoadingSpinner = ({ className, size = 'md', message }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4'
  };

  return (
    <div className={cn("flex flex-col items-center justify-center p-8", className)}>
      <div className="relative">
        <div
          className={cn(
            "animate-spin rounded-full border-primary-500/20 border-t-primary-500",
            sizeClasses[size]
          )}
        />
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/10 to-secondary-500/10 blur-xl animate-pulse" />
      </div>
      {message && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400 animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};