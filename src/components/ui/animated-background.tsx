import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'intense' | 'waves';
  speed?: 'slow' | 'normal' | 'fast';
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  children,
  className,
  variant = 'default',
  speed = 'normal'
}) => {
  const speedDuration = {
    slow: '30s',
    normal: '20s',
    fast: '10s'
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'subtle':
        return 'animated-bg-subtle';
      case 'intense':
        return 'animated-bg-intense';
      case 'waves':
        return 'animated-bg-waves';
      default:
        return 'animated-bg-default';
    }
  };

  return (
    <div className={cn('relative min-h-screen overflow-hidden', className)}>
      {/* Animated gradient background */}
      <div 
        className={cn(
          'absolute inset-0 -z-10',
          getVariantStyles()
        )}
        style={{
          animationDuration: speedDuration[speed]
        }}
      />
      
      {/* Additional floating orbs for depth */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div 
          className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full bg-gradient-radial from-purple-600/20 via-transparent to-transparent blur-3xl animate-float-slow"
          style={{ animationDuration: speedDuration[speed] }}
        />
        <div 
          className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full bg-gradient-radial from-pink-600/20 via-transparent to-transparent blur-3xl animate-float-reverse"
          style={{ animationDuration: speedDuration[speed] }}
        />
        <div 
          className="absolute top-1/4 left-1/3 w-1/2 h-1/2 rounded-full bg-gradient-radial from-blue-600/15 via-transparent to-transparent blur-2xl animate-pulse-slow"
          style={{ animationDuration: `calc(${speedDuration[speed]} * 1.5)` }}
        />
      </div>

      {/* Content */}
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}

      {/* CSS styles */}
      <style jsx>{`
        @keyframes moveGradient {
          0% {
            background-position: 0% 0%;
            transform: scale(1) rotate(0deg);
          }
          25% {
            background-position: 50% 25%;
            transform: scale(1.05) rotate(1deg);
          }
          50% {
            background-position: 100% 50%;
            transform: scale(1.1) rotate(0deg);
          }
          75% {
            background-position: 50% 75%;
            transform: scale(1.05) rotate(-1deg);
          }
          100% {
            background-position: 0% 0%;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes floatAnimation {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(10%, 10%) scale(1.1);
          }
          50% {
            transform: translate(-5%, 20%) scale(0.95);
          }
          75% {
            transform: translate(15%, -10%) scale(1.05);
          }
        }

        @keyframes floatReverse {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(-10%, -10%) scale(0.95);
          }
          50% {
            transform: translate(5%, -20%) scale(1.05);
          }
          75% {
            transform: translate(-15%, 10%) scale(1.1);
          }
        }

        @keyframes pulseSlow {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.2);
          }
        }

        .animated-bg-default {
          background: 
            radial-gradient(circle at 20% 30%, rgba(147, 51, 234, 0.35), transparent 60%),
            radial-gradient(circle at 80% 70%, rgba(236, 72, 153, 0.35), transparent 70%),
            radial-gradient(circle at 50% 100%, rgba(59, 130, 246, 0.25), transparent 80%),
            linear-gradient(120deg, #0f172a, #1e1b4b, #312e81);
          background-size: 200% 200%;
          animation: moveGradient ease infinite;
        }

        .animated-bg-subtle {
          background: 
            radial-gradient(circle at 20% 30%, rgba(147, 51, 234, 0.25), transparent 60%),
            radial-gradient(circle at 80% 70%, rgba(236, 72, 153, 0.25), transparent 70%),
            radial-gradient(circle at 50% 100%, rgba(59, 130, 246, 0.20), transparent 80%),
            linear-gradient(120deg, #0f172a, #1e1b4b, #312e81);
          background-size: 200% 200%;
          animation: moveGradient ease infinite;
        }

        .animated-bg-intense {
          background: 
            radial-gradient(circle at 10% 10%, #9333ea 0%, transparent 30%),
            radial-gradient(circle at 90% 90%, #3b82f6 0%, transparent 30%),
            radial-gradient(circle at 50% 50%, #ec4899 0%, transparent 40%),
            radial-gradient(circle at 30% 70%, #10b981 0%, transparent 35%),
            radial-gradient(circle at 70% 30%, #f59e0b 0%, transparent 35%),
            linear-gradient(100deg, #0f172a 0%, #1e1b4b 35%, #312e81 70%, #1e1b4b 100%);
          background-size: 250% 250%;
          animation: moveGradient ease infinite;
        }

        .animated-bg-waves {
          background: 
            radial-gradient(ellipse at top, #9333ea33 0%, transparent 50%),
            radial-gradient(ellipse at bottom, #3b82f633 0%, transparent 50%),
            radial-gradient(ellipse at center, #ec489933 0%, transparent 60%),
            linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%);
          background-size: 200% 200%;
          animation: moveGradient ease infinite;
        }

        .animate-float-slow {
          animation: floatAnimation ease-in-out infinite;
        }

        .animate-float-reverse {
          animation: floatReverse ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulseSlow ease-in-out infinite;
        }

        /* Light mode adjustments */
        @media (prefers-color-scheme: light) {
          .animated-bg-default {
            background: 
              radial-gradient(circle at 20% 30%, rgba(147, 51, 234, 0.15), transparent 60%),
              radial-gradient(circle at 80% 70%, rgba(236, 72, 153, 0.15), transparent 70%),
              radial-gradient(circle at 50% 100%, rgba(59, 130, 246, 0.10), transparent 80%),
              linear-gradient(120deg, #fafafb, #f3f2f7, #e8e5f5);
            background-size: 200% 200%;
            animation: moveGradient ease infinite;
          }

          .animated-bg-subtle {
            background: 
              radial-gradient(circle at 20% 30%, rgba(147, 51, 234, 0.08), transparent 60%),
              radial-gradient(circle at 80% 70%, rgba(236, 72, 153, 0.08), transparent 70%),
              radial-gradient(circle at 50% 100%, rgba(59, 130, 246, 0.06), transparent 80%),
              linear-gradient(120deg, #ffffff, #fafafb, #f3f2f7);
            background-size: 200% 200%;
            animation: moveGradient ease infinite;
          }

          .animated-bg-intense {
            background: 
              radial-gradient(circle at 10% 10%, #9333ea20 0%, transparent 30%),
              radial-gradient(circle at 90% 90%, #3b82f620 0%, transparent 30%),
              radial-gradient(circle at 50% 50%, #ec489920 0%, transparent 40%),
              radial-gradient(circle at 30% 70%, #10b98120 0%, transparent 35%),
              radial-gradient(circle at 70% 30%, #f59e0b20 0%, transparent 35%),
              linear-gradient(100deg, #f8fafc 0%, #f1f5f9 35%, #e2e8f0 70%, #f1f5f9 100%);
          }

          .animated-bg-waves {
            background: 
              radial-gradient(ellipse at top, #9333ea10 0%, transparent 50%),
              radial-gradient(ellipse at bottom, #3b82f610 0%, transparent 50%),
              radial-gradient(ellipse at center, #ec489910 0%, transparent 60%),
              linear-gradient(180deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%);
          }
        }
      `}</style>
    </div>
  );
};

export default AnimatedBackground;