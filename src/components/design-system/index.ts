/**
 * Design System Néon - Export centralisé
 *
 * Ce fichier exporte tous les composants du design system néon
 * pour faciliter leur utilisation dans l'application.
 */

// Boutons
export { default as NeonButton } from './NeonButton';
export type { NeonButtonProps } from './NeonButton';

// Cards
export {
  default as NeonCard,
  NeonCardHeader,
  NeonCardTitle,
  NeonCardDescription,
  NeonCardContent,
  NeonCardFooter,
} from './NeonCard';
export type { NeonCardProps } from './NeonCard';

// Inputs
export {
  default as NeonInput,
  NeonTextarea,
} from './NeonInput';
export type { NeonInputProps } from './NeonInput';

// Containers
export {
  default as GlassmorphicContainer,
  GlassmorphicHero,
} from './GlassmorphicContainer';
export type { GlassmorphicContainerProps } from './GlassmorphicContainer';

// Badge néon personnalisé
export { default as NeonBadge } from './NeonBadge';
export type { NeonBadgeProps } from './NeonBadge';

// Composants supplémentaires à venir
// export { default as NeonSelect } from './NeonSelect';
// export { default as NeonModal } from './NeonModal';
// export { default as NeonTooltip } from './NeonTooltip';
// export { default as NeonProgress } from './NeonProgress';
// export { default as NeonAvatar } from './NeonAvatar';

/**
 * Presets de thème pour une utilisation rapide
 */
export const neonTheme = {
  colors: {
    primary: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
      950: '#3b0764',
    },
    secondary: {
      50: '#fdf2f8',
      100: '#fce7f3',
      200: '#fbcfe8',
      300: '#f9a8d4',
      400: '#f472b6',
      500: '#ec4899',
      600: '#db2777',
      700: '#be185d',
      800: '#9f1239',
      900: '#831843',
      950: '#500724',
    },
    accent: {
      cyan: '#06b6d4',
      blue: '#3b82f6',
      indigo: '#6366f1',
    },
  },
  shadows: {
    neon: {
      purple: '0 0 15px rgba(168,85,247,0.5)',
      pink: '0 0 15px rgba(236,72,153,0.5)',
      cyan: '0 0 15px rgba(6,182,212,0.5)',
    },
    glow: {
      sm: '0 0 10px',
      md: '0 0 20px',
      lg: '0 0 30px',
      xl: '0 0 40px',
    },
  },
  animations: {
    pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    glow: 'glow 2s ease-in-out infinite',
    float: 'float 4s ease-in-out infinite',
    shimmer: 'shimmer 2s linear infinite',
  },
};

/**
 * Utility classes pour effets néon rapides
 */
export const neonClasses = {
  // Text effects
  textGradient: 'bg-gradient-to-r from-primary-400 to-secondary-400 text-transparent bg-clip-text',
  textGlow: 'text-shadow-[0_0_10px_currentColor]',

  // Button effects
  buttonNeon: 'shadow-[0_0_15px_rgba(168,85,247,0.5)] hover:shadow-[0_0_25px_rgba(168,85,247,0.7)]',
  buttonGradient: 'bg-gradient-to-r from-primary-500 to-secondary-500',

  // Card effects
  cardGlass: 'backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20',
  cardNeon: 'border border-primary-500/20 shadow-[0_0_30px_rgba(168,85,247,0.1)]',

  // Input effects
  inputNeon: 'focus:shadow-[0_0_10px_rgba(168,85,247,0.3)] focus:border-primary-500',

  // Animation classes
  animatePulse: 'animate-pulse',
  animateGlow: 'animate-[glow_2s_ease-in-out_infinite]',
  animateFloat: 'animate-[float_4s_ease-in-out_infinite]',
};