import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  className?: string;
}

export function StarRating({ rating, maxRating = 5, size = 16, className }: StarRatingProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: maxRating }, (_, index) => {
        const filled = index < Math.floor(rating);
        const halfFilled = index === Math.floor(rating) && rating % 1 >= 0.5;
        
        return (
          <Star
            key={index}
            size={size}
            className={cn(
              "transition-colors",
              filled || halfFilled
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            )}
          />
        );
      })}
      <span className="text-sm text-muted-foreground ml-1">
        ({rating.toFixed(1)})
      </span>
    </div>
  );
}