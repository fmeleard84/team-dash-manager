import { Sparkles } from 'lucide-react';

interface IallaLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const IallaLogo = ({ size = 'md', showText = true, className = '' }: IallaLogoProps) => {
  const sizeClasses = {
    sm: { 
      container: 'w-8 h-8', 
      icon: 'w-4 h-4', 
      text: 'text-sm font-bold' 
    },
    md: { 
      container: 'w-12 h-12', 
      icon: 'w-6 h-6', 
      text: 'text-lg font-bold' 
    },
    lg: { 
      container: 'w-16 h-16', 
      icon: 'w-8 h-8', 
      text: 'text-xl font-bold' 
    }
  };
  
  const sizes = sizeClasses[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${sizes.container} bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center`}>
        <Sparkles className={`${sizes.icon} text-white`} />
      </div>
      {showText && (
        <span className={`${sizes.text} bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
          Ialla
        </span>
      )}
    </div>
  );
};