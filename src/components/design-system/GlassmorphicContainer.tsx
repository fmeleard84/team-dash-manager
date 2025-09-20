import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface GlassmorphicContainerProps extends HTMLAttributes<HTMLDivElement> {
  blur?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  opacity?: number;
  gradient?: boolean;
  border?: boolean;
  shadow?: boolean;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  hover?: boolean;
  animate?: boolean;
}

const GlassmorphicContainer = forwardRef<HTMLDivElement, GlassmorphicContainerProps & HTMLMotionProps<"div">>(
  ({
    className,
    blur = 'xl',
    opacity = 10,
    gradient = false,
    border = true,
    shadow = true,
    rounded = '2xl',
    hover = false,
    animate = false,
    children,
    ...props
  }, ref) => {
    // Classes de blur
    const blurClasses = {
      sm: 'backdrop-blur-sm',
      md: 'backdrop-blur-md',
      lg: 'backdrop-blur-lg',
      xl: 'backdrop-blur-xl',
      '2xl': 'backdrop-blur-2xl',
    };

    // Classes d'arrondi
    const roundedClasses = {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl',
      '3xl': 'rounded-3xl',
      full: 'rounded-full',
    };

    // Calcul de l'opacité du background
    const bgOpacity = opacity / 100;
    const bgColor = `rgba(255, 255, 255, ${bgOpacity})`; // Light mode
    const bgColorDark = `rgba(0, 0, 0, ${bgOpacity * 2})`; // Dark mode

    // Classes de base
    const baseClasses = cn(
      'relative',
      blurClasses[blur],
      roundedClasses[rounded],
      border && 'border border-white/20 dark:border-white/10',
      shadow && 'shadow-xl',
      hover && 'transition-all duration-300',
      hover && 'hover:shadow-2xl hover:shadow-primary-500/10',
      hover && border && 'hover:border-white/30 dark:hover:border-white/20',
      'overflow-hidden'
    );

    // Animation de floating
    const floatingAnimation = animate ? {
      animate: {
        y: [0, -10, 0],
      },
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }
    } : {};

    return (
      <motion.div
        ref={ref}
        className={cn(baseClasses, className)}
        style={{
          backgroundColor: bgColor,
          ...(props.style || {})
        }}
        {...floatingAnimation}
        {...props}
      >
        {/* Gradient overlay optionnel */}
        {gradient && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-secondary-500/5 pointer-events-none" />
        )}

        {/* Effet de lumière animé optionnel */}
        {animate && (
          <>
            {/* Particules de lumière */}
            <motion.div
              className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary-400/20 rounded-full blur-3xl"
              animate={{
                x: [0, 50, 0],
                y: [0, 30, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-secondary-400/20 rounded-full blur-3xl"
              animate={{
                x: [0, -30, 0],
                y: [0, -50, 0],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
            />
          </>
        )}

        {/* Style dark mode */}
        <style jsx>{`
          @media (prefers-color-scheme: dark) {
            .${baseClasses.split(' ').join('.')} {
              background-color: ${bgColorDark};
            }
          }
        `}</style>

        {/* Contenu */}
        <div className="relative z-10">
          {children}
        </div>
      </motion.div>
    );
  }
);

GlassmorphicContainer.displayName = 'GlassmorphicContainer';

// Variante pour sections hero avec effets avancés
export const GlassmorphicHero = forwardRef<HTMLDivElement, GlassmorphicContainerProps & {
  backgroundImage?: string;
  overlay?: boolean;
  particles?: boolean;
}>(
  ({
    className,
    backgroundImage,
    overlay = true,
    particles = false,
    children,
    ...props
  }, ref) => {
    return (
      <div className="relative overflow-hidden">
        {/* Image de fond */}
        {backgroundImage && (
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}

        {/* Overlay gradient */}
        {overlay && (
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/50 via-neutral-900/70 to-neutral-900/90 z-1" />
        )}

        {/* Particules animées */}
        {particles && (
          <div className="absolute inset-0 z-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/30 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -100],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: Math.random() * 5 + 5,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                  ease: "linear",
                }}
              />
            ))}
          </div>
        )}

        {/* Container glassmorphique */}
        <GlassmorphicContainer
          ref={ref}
          className={cn('relative z-10', className)}
          blur="2xl"
          opacity={5}
          gradient
          {...props}
        >
          {children}
        </GlassmorphicContainer>
      </div>
    );
  }
);

GlassmorphicHero.displayName = 'GlassmorphicHero';

export default GlassmorphicContainer;