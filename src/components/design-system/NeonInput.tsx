import { forwardRef, InputHTMLAttributes, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { LucideIcon, Eye, EyeOff, Search, X } from 'lucide-react';

export interface NeonInputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'neon' | 'glass';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  label?: string;
  error?: string;
  success?: boolean;
  clearable?: boolean;
  onClear?: () => void;
  showPasswordToggle?: boolean;
  glow?: boolean;
}

const NeonInput = forwardRef<HTMLInputElement, NeonInputProps>(
  ({
    className,
    variant = 'default',
    icon: Icon,
    iconPosition = 'left',
    label,
    error,
    success,
    clearable = false,
    onClear,
    showPasswordToggle = false,
    glow = false,
    type: initialType,
    value,
    disabled,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Déterminer le type réel (pour le toggle password)
    const type = showPasswordToggle && initialType === 'password'
      ? (showPassword ? 'text' : 'password')
      : initialType;

    // Classes de variante
    const variantClasses = {
      default: cn(
        'bg-white dark:bg-neutral-900',
        'border border-neutral-200 dark:border-neutral-700',
        'focus:border-primary-500 dark:focus:border-primary-400',
        'focus:ring-2 focus:ring-primary-500/20',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
        success && 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
      ),

      neon: cn(
        'bg-neutral-50 dark:bg-neutral-900/50',
        'border border-neutral-200 dark:border-neutral-700',
        'focus:border-primary-500',
        glow || isFocused
          ? 'shadow-[0_0_10px_rgba(168,85,247,0.3)]'
          : '',
        'focus:shadow-[0_0_15px_rgba(168,85,247,0.4)]',
        'focus:ring-0',
        error && 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]',
        success && 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
      ),

      glass: cn(
        'backdrop-blur-xl',
        'bg-white/10 dark:bg-black/20',
        'border border-white/20 dark:border-white/10',
        'focus:bg-white/20 dark:focus:bg-black/30',
        'focus:border-primary-500/50',
        'focus:ring-2 focus:ring-primary-500/20',
        error && 'border-red-500/50 focus:ring-red-500/20',
        success && 'border-green-500/50 focus:ring-green-500/20'
      ),
    };

    // Classes de base
    const baseClasses = cn(
      'w-full',
      'rounded-xl',
      'px-4 py-3',
      'transition-all duration-200',
      'placeholder:text-neutral-400 dark:placeholder:text-neutral-600',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      Icon && iconPosition === 'left' && 'pl-11',
      Icon && iconPosition === 'right' && 'pr-11',
      (clearable || showPasswordToggle) && 'pr-11',
      variantClasses[variant]
    );

    return (
      <div className="space-y-2">
        {/* Label avec animation */}
        {label && (
          <motion.label
            className={cn(
              'block text-sm font-medium',
              'text-neutral-700 dark:text-neutral-300',
              error && 'text-red-500',
              success && 'text-green-500'
            )}
            animate={{
              color: error ? '#ef4444' : success ? '#22c55e' : undefined
            }}
          >
            {label}
          </motion.label>
        )}

        {/* Container de l'input */}
        <div className="relative">
          {/* Icône gauche */}
          {Icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              <Icon size={20} />
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            type={type}
            value={value}
            disabled={disabled}
            className={cn(baseClasses, className)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />

          {/* Icône droite */}
          {Icon && iconPosition === 'right' && !clearable && !showPasswordToggle && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              <Icon size={20} />
            </div>
          )}

          {/* Bouton clear */}
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              <X size={18} />
            </button>
          )}

          {/* Toggle password */}
          {showPasswordToggle && initialType === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              disabled={disabled}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}

          {/* Effet de focus animé pour variante néon */}
          {variant === 'neon' && isFocused && (
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 blur-xl" />
            </motion.div>
          )}
        </div>

        {/* Message d'erreur ou de succès */}
        {error && (
          <motion.p
            className="text-sm text-red-500"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.p>
        )}

        {success && !error && (
          <motion.p
            className="text-sm text-green-500"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            ✓ Validé
          </motion.p>
        )}
      </div>
    );
  }
);

NeonInput.displayName = 'NeonInput';

// Variante TextArea avec les mêmes styles
export const NeonTextarea = forwardRef<HTMLTextAreaElement,
  Omit<NeonInputProps, 'type' | 'showPasswordToggle' | 'clearable'> & {
    rows?: number;
    resizable?: boolean;
  }
>(
  ({
    className,
    variant = 'default',
    icon: Icon,
    iconPosition = 'left',
    label,
    error,
    success,
    glow = false,
    rows = 4,
    resizable = true,
    disabled,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    // Classes de variante (réutilisation)
    const variantClasses = {
      default: cn(
        'bg-white dark:bg-neutral-900',
        'border border-neutral-200 dark:border-neutral-700',
        'focus:border-primary-500 dark:focus:border-primary-400',
        'focus:ring-2 focus:ring-primary-500/20',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
        success && 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
      ),

      neon: cn(
        'bg-neutral-50 dark:bg-neutral-900/50',
        'border border-neutral-200 dark:border-neutral-700',
        'focus:border-primary-500',
        glow || isFocused
          ? 'shadow-[0_0_10px_rgba(168,85,247,0.3)]'
          : '',
        'focus:shadow-[0_0_15px_rgba(168,85,247,0.4)]',
        'focus:ring-0',
        error && 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]',
        success && 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
      ),

      glass: cn(
        'backdrop-blur-xl',
        'bg-white/10 dark:bg-black/20',
        'border border-white/20 dark:border-white/10',
        'focus:bg-white/20 dark:focus:bg-black/30',
        'focus:border-primary-500/50',
        'focus:ring-2 focus:ring-primary-500/20'
      ),
    };

    const baseClasses = cn(
      'w-full',
      'rounded-xl',
      'px-4 py-3',
      'transition-all duration-200',
      'placeholder:text-neutral-400 dark:placeholder:text-neutral-600',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      !resizable && 'resize-none',
      variantClasses[variant]
    );

    return (
      <div className="space-y-2">
        {label && (
          <label className={cn(
            'block text-sm font-medium',
            'text-neutral-700 dark:text-neutral-300',
            error && 'text-red-500',
            success && 'text-green-500'
          )}>
            {label}
          </label>
        )}

        <div className="relative">
          <textarea
            ref={ref}
            rows={rows}
            disabled={disabled}
            className={cn(baseClasses, className)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />

          {variant === 'neon' && isFocused && (
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 blur-xl" />
            </motion.div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {success && !error && (
          <p className="text-sm text-green-500">✓ Validé</p>
        )}
      </div>
    );
  }
);

NeonTextarea.displayName = 'NeonTextarea';

export default NeonInput;