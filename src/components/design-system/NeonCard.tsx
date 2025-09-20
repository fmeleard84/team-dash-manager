import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface NeonCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'neon' | 'gradient-border';
  hover?: boolean;
  glow?: boolean;
  pulse?: boolean;
  borderGradient?: boolean;
  blurBackground?: boolean;
}

const NeonCard = forwardRef<HTMLDivElement, NeonCardProps & HTMLMotionProps<"div">>(
  ({
    className,
    variant = 'default',
    hover = true,
    glow = false,
    pulse = false,
    borderGradient = false,
    blurBackground = false,
    children,
    ...props
  }, ref) => {
    // Classes de variante
    const variantClasses = {
      default: cn(
        blurBackground
          ? 'backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80'
          : 'bg-white dark:bg-neutral-900',
        'border border-neutral-200/50 dark:border-neutral-700/50',
        'shadow-xl',
        hover && 'hover:shadow-2xl hover:shadow-primary-500/10'
      ),

      glass: cn(
        'backdrop-blur-xl',
        'bg-white/10 dark:bg-black/20',
        'border border-white/20 dark:border-white/10',
        'shadow-xl',
        hover && 'hover:bg-white/15 dark:hover:bg-black/30',
        hover && 'hover:shadow-[0_0_30px_rgba(168,85,247,0.1)]'
      ),

      neon: cn(
        'relative',
        'bg-gradient-to-br from-neutral-900 to-neutral-950',
        'border border-primary-500/20',
        'shadow-[0_0_30px_rgba(168,85,247,0.1)]',
        hover && 'hover:shadow-[0_0_40px_rgba(168,85,247,0.2)]',
        hover && 'hover:border-primary-500/40',
        glow && 'shadow-[0_0_50px_rgba(168,85,247,0.3)]'
      ),

      'gradient-border': 'p-0', // Géré différemment avec wrapper
    };

    // Animation de pulsation
    const pulseAnimation = pulse ? {
      animate: {
        boxShadow: [
          '0 0 20px rgba(168,85,247,0.1)',
          '0 0 40px rgba(168,85,247,0.3)',
          '0 0 20px rgba(168,85,247,0.1)',
        ],
      },
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }
    } : {};

    // Classes de base
    const baseClasses = cn(
      'rounded-2xl',
      'transition-all duration-300',
      hover && 'hover:scale-[1.02]',
      variantClasses[variant]
    );

    // Si c'est une carte avec bordure gradient
    if (variant === 'gradient-border' || borderGradient) {
      return (
        <div
          className={cn(
            'p-[1px]',
            'bg-gradient-to-r from-primary-500 to-secondary-500',
            'rounded-2xl',
            hover && 'hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]',
            'transition-all duration-300',
            hover && 'hover:scale-[1.02]',
            className
          )}
        >
          <motion.div
            ref={ref}
            className={cn(
              'bg-white dark:bg-neutral-900',
              'rounded-2xl',
              'p-6',
              'h-full'
            )}
            {...pulseAnimation}
            {...props}
          >
            {children}
          </motion.div>
        </div>
      );
    }

    return (
      <motion.div
        ref={ref}
        className={cn(baseClasses, 'p-6', className)}
        {...pulseAnimation}
        {...props}
      >
        {/* Effet de brillance pour variante néon */}
        {variant === 'neon' && (
          <>
            {/* Gradient overlay subtil */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-secondary-500/5 rounded-2xl pointer-events-none" />

            {/* Points de lumière animés */}
            <motion.div
              className="absolute top-4 right-4 w-2 h-2 bg-primary-400 rounded-full blur-sm"
              animate={{
                opacity: [0.5, 1, 0.5],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute bottom-4 left-4 w-2 h-2 bg-secondary-400 rounded-full blur-sm"
              animate={{
                opacity: [0.5, 1, 0.5],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.5,
              }}
            />
          </>
        )}

        {children}
      </motion.div>
    );
  }
);

NeonCard.displayName = 'NeonCard';

// Composants associés pour une structure complète
export const NeonCardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('space-y-1.5 mb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
);
NeonCardHeader.displayName = 'NeonCardHeader';

export const NeonCardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-2xl font-semibold leading-none tracking-tight',
        'bg-gradient-to-r from-primary-400 to-secondary-400',
        'text-transparent bg-clip-text',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
);
NeonCardTitle.displayName = 'NeonCardTitle';

export const NeonCardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-neutral-500 dark:text-neutral-400', className)}
      {...props}
    >
      {children}
    </p>
  )
);
NeonCardDescription.displayName = 'NeonCardDescription';

export const NeonCardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative', className)}
      {...props}
    >
      {children}
    </div>
  )
);
NeonCardContent.displayName = 'NeonCardContent';

export const NeonCardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4 mt-4 border-t border-neutral-200 dark:border-neutral-800', className)}
      {...props}
    >
      {children}
    </div>
  )
);
NeonCardFooter.displayName = 'NeonCardFooter';

export default NeonCard;