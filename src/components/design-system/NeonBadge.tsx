import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export interface NeonBadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neon';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  pulse?: boolean;
  glow?: boolean;
  gradient?: boolean;
  rounded?: 'md' | 'lg' | 'full';
  outline?: boolean;
}

const NeonBadge = forwardRef<HTMLDivElement, NeonBadgeProps & HTMLMotionProps<"div">>(
  ({
    className,
    variant = 'default',
    size = 'md',
    icon: Icon,
    pulse = false,
    glow = false,
    gradient = false,
    rounded = 'full',
    outline = false,
    children,
    ...props
  }, ref) => {
    // Classes de taille
    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-base',
    };

    // Taille de l'icône
    const iconSizes = {
      sm: 12,
      md: 14,
      lg: 16,
    };

    // Classes d'arrondi
    const roundedClasses = {
      md: 'rounded-md',
      lg: 'rounded-lg',
      full: 'rounded-full',
    };

    // Classes de variante
    const variantClasses = {
      default: cn(
        outline
          ? 'bg-transparent border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300'
          : gradient
          ? 'bg-gradient-to-r from-neutral-100 to-neutral-200 dark:from-neutral-700 dark:to-neutral-800 text-neutral-900 dark:text-neutral-100'
          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100',
        glow && 'shadow-[0_0_8px_rgba(150,150,150,0.3)]'
      ),

      success: cn(
        outline
          ? 'bg-transparent border border-green-500 text-green-600 dark:text-green-400'
          : gradient
          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
          : 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20',
        glow && 'shadow-[0_0_10px_rgba(34,197,94,0.3)]'
      ),

      warning: cn(
        outline
          ? 'bg-transparent border border-amber-500 text-amber-600 dark:text-amber-400'
          : gradient
          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        glow && 'shadow-[0_0_10px_rgba(245,158,11,0.3)]'
      ),

      danger: cn(
        outline
          ? 'bg-transparent border border-red-500 text-red-600 dark:text-red-400'
          : gradient
          ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
          : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
        glow && 'shadow-[0_0_10px_rgba(239,68,68,0.3)]'
      ),

      info: cn(
        outline
          ? 'bg-transparent border border-blue-500 text-blue-600 dark:text-blue-400'
          : gradient
          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
        glow && 'shadow-[0_0_10px_rgba(59,130,246,0.3)]'
      ),

      neon: cn(
        'relative',
        gradient
          ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white'
          : 'bg-primary-500/10 text-primary-400',
        'border border-primary-500/30',
        'shadow-[0_0_10px_rgba(168,85,247,0.3)]',
        'hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]',
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-primary-400/20 before:to-secondary-400/20',
        'before:blur-md before:opacity-50',
        'overflow-hidden'
      ),
    };

    // Animation de pulsation
    const pulseAnimation = pulse ? {
      animate: {
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
      },
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }
    } : {};

    // Classes de base
    const baseClasses = cn(
      'inline-flex items-center gap-1.5',
      'font-medium',
      'transition-all duration-200',
      'hover:scale-105',
      sizeClasses[size],
      roundedClasses[rounded],
      variantClasses[variant]
    );

    return (
      <motion.div
        ref={ref}
        className={cn(baseClasses, className)}
        {...pulseAnimation}
        {...props}
      >
        {/* Effet de brillance pour variante néon */}
        {variant === 'neon' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{
              x: ['-200%', '200%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}

        {/* Contenu */}
        <span className="relative flex items-center gap-1.5">
          {Icon && (
            <Icon size={iconSizes[size]} />
          )}
          {children}
        </span>
      </motion.div>
    );
  }
);

NeonBadge.displayName = 'NeonBadge';

// Composant pour un groupe de badges
export const NeonBadgeGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-wrap gap-2', className)}
      {...props}
    >
      {children}
    </div>
  )
);
NeonBadgeGroup.displayName = 'NeonBadgeGroup';

// Badge avec compteur animé
export const NeonCountBadge = forwardRef<HTMLDivElement,
  NeonBadgeProps & {
    count: number;
    maxCount?: number;
    showPlus?: boolean;
  }
>(
  ({
    count,
    maxCount = 99,
    showPlus = true,
    ...props
  }, ref) => {
    const displayCount = count > maxCount
      ? `${maxCount}${showPlus ? '+' : ''}`
      : count.toString();

    return (
      <NeonBadge
        ref={ref}
        {...props}
      >
        <motion.span
          key={count}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
        >
          {displayCount}
        </motion.span>
      </NeonBadge>
    );
  }
);
NeonCountBadge.displayName = 'NeonCountBadge';

export default NeonBadge;