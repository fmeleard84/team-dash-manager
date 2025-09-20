import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export interface NeonButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof HTMLMotionProps<"button">> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'neon' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  pulse?: boolean;
  glow?: boolean;
  gradient?: boolean;
  fullWidth?: boolean;
}

const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps & HTMLMotionProps<"button">>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconPosition = 'left',
    loading = false,
    pulse = false,
    glow = false,
    gradient = true,
    fullWidth = false,
    disabled,
    children,
    ...props
  }, ref) => {
    // Classes de taille
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
      xl: 'px-8 py-4 text-lg font-semibold',
    };

    // Classes de variante avec effets néon
    const variantClasses = {
      primary: cn(
        gradient
          ? 'bg-gradient-to-r from-primary-500 to-secondary-500'
          : 'bg-primary-500',
        'text-white font-medium',
        'shadow-lg shadow-primary-500/25',
        'hover:shadow-xl hover:shadow-primary-500/40',
        glow && 'shadow-[0_0_20px_rgba(168,85,247,0.5)]',
        'hover:shadow-[0_0_30px_rgba(168,85,247,0.7)]'
      ),

      secondary: cn(
        'bg-neutral-100 dark:bg-neutral-800',
        'text-neutral-900 dark:text-white',
        'border border-neutral-200 dark:border-neutral-700',
        'hover:bg-neutral-200 dark:hover:bg-neutral-700',
        glow && 'hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]'
      ),

      ghost: cn(
        'text-neutral-600 dark:text-neutral-400',
        'hover:text-primary-500 dark:hover:text-primary-400',
        'hover:bg-neutral-100 dark:hover:bg-neutral-800'
      ),

      neon: cn(
        'relative',
        gradient
          ? 'bg-gradient-to-r from-primary-600 to-secondary-600'
          : 'bg-primary-600',
        'text-white font-bold',
        'shadow-[0_0_20px_rgba(168,85,247,0.5)]',
        'hover:shadow-[0_0_30px_rgba(168,85,247,0.7)]',
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-primary-400 before:to-secondary-400',
        'before:blur-xl before:opacity-50',
        'hover:before:opacity-75',
        'before:transition-opacity before:duration-300',
        'overflow-hidden'
      ),

      danger: cn(
        gradient
          ? 'bg-gradient-to-r from-red-500 to-rose-500'
          : 'bg-red-500',
        'text-white font-medium',
        'shadow-lg shadow-red-500/25',
        'hover:shadow-xl hover:shadow-red-500/40',
        glow && 'shadow-[0_0_20px_rgba(239,68,68,0.5)]',
        'hover:shadow-[0_0_30px_rgba(239,68,68,0.7)]'
      ),
    };

    // Animation de pulsation
    const pulseAnimation = pulse ? {
      animate: {
        scale: [1, 1.02, 1],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }
    } : {};

    // Classes communes
    const baseClasses = cn(
      'relative inline-flex items-center justify-center',
      'rounded-xl',
      'transition-all duration-200',
      'hover:scale-105 active:scale-95',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
      fullWidth && 'w-full',
      sizeClasses[size],
      variantClasses[variant]
    );

    // Taille de l'icône selon la taille du bouton
    const iconSizes = {
      sm: 14,
      md: 16,
      lg: 20,
      xl: 24,
    };

    return (
      <motion.button
        ref={ref}
        className={cn(baseClasses, className)}
        disabled={disabled || loading}
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        {...pulseAnimation}
        {...props}
      >
        {/* Effet de brillance animé pour variante néon */}
        {variant === 'neon' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
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

        {/* Contenu du bouton */}
        <span className="relative flex items-center gap-2">
          {loading ? (
            <motion.div
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            <>
              {Icon && iconPosition === 'left' && (
                <Icon size={iconSizes[size]} />
              )}
              {children}
              {Icon && iconPosition === 'right' && (
                <Icon size={iconSizes[size]} />
              )}
            </>
          )}
        </span>
      </motion.button>
    );
  }
);

NeonButton.displayName = 'NeonButton';

export default NeonButton;