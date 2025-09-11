import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { User, Crown, Code, Briefcase, Users, Star, CheckCircle } from 'lucide-react';

export interface UserData {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  role?: string;
  jobTitle?: string;
  position?: string;
  seniority?: string;
  status?: 'online' | 'offline' | 'busy' | 'away';
  isTeamLead?: boolean;
  isValidated?: boolean;
  hourlyRate?: number;
  dailyRate?: number;
}

export interface UserAvatarNeonProps {
  user: UserData;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  showRole?: boolean;
  showStatus?: boolean;
  showRate?: boolean;
  showBadges?: boolean;
  variant?: 'default' | 'card' | 'list' | 'compact' | 'detailed';
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

const sizeClasses = {
  xs: { avatar: 'h-6 w-6', text: 'text-[10px]', role: 'text-[8px]', icon: 'h-3 w-3' },
  sm: { avatar: 'h-8 w-8', text: 'text-xs', role: 'text-[10px]', icon: 'h-4 w-4' },
  md: { avatar: 'h-10 w-10', text: 'text-sm', role: 'text-xs', icon: 'h-5 w-5' },
  lg: { avatar: 'h-12 w-12', text: 'text-base', role: 'text-sm', icon: 'h-6 w-6' },
  xl: { avatar: 'h-16 w-16', text: 'text-lg', role: 'text-base', icon: 'h-8 w-8' }
};

const statusColors = {
  online: 'bg-green-400',
  offline: 'bg-gray-400',
  busy: 'bg-red-400',
  away: 'bg-yellow-400'
};

const seniorityColors = {
  junior: 'from-green-500 to-emerald-500',
  confirmé: 'from-blue-500 to-cyan-500',
  senior: 'from-purple-500 to-pink-500',
  expert: 'from-orange-500 to-red-500',
  lead: 'from-yellow-500 to-amber-500'
};

export const UserAvatarNeon: React.FC<UserAvatarNeonProps> = ({
  user,
  size = 'md',
  showName = true,
  showRole = true,
  showStatus = false,
  showRate = false,
  showBadges = false,
  variant = 'default',
  className,
  onClick,
  interactive = !!onClick
}) => {
  const sizeConfig = sizeClasses[size];
  
  // Construire le nom complet
  const displayName = user.name || 
    (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '') ||
    user.email?.split('@')[0] || 
    'Utilisateur';
    
  // Obtenir les initiales
  const getInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  };
  
  // Déterminer le gradient en fonction du rôle ou de la séniorité
  const getGradient = () => {
    if (user.seniority && seniorityColors[user.seniority as keyof typeof seniorityColors]) {
      return seniorityColors[user.seniority as keyof typeof seniorityColors];
    }
    return 'from-purple-500 to-pink-500';
  };
  
  // Obtenir l'icône de rôle
  const getRoleIcon = () => {
    const role = user.role?.toLowerCase() || '';
    const position = user.position?.toLowerCase() || '';
    const jobTitle = user.jobTitle?.toLowerCase() || '';
    
    if (user.isTeamLead) return Crown;
    if (role.includes('dev') || position.includes('dev') || jobTitle.includes('dev')) return Code;
    if (role.includes('manager') || position.includes('manager')) return Briefcase;
    if (role.includes('team') || position.includes('team')) return Users;
    return User;
  };
  
  const RoleIcon = getRoleIcon();
  
  // Déterminer le rôle à afficher
  const displayRole = user.jobTitle || user.position || user.role || '';
  
  // Formater le taux
  const formatRate = () => {
    if (user.hourlyRate) return `${user.hourlyRate}€/h`;
    if (user.dailyRate) return `${user.dailyRate}€/j`;
    return null;
  };

  // Composant Avatar de base
  const AvatarComponent = (
    <div className="relative">
      <Avatar className={cn(
        sizeConfig.avatar,
        "border-2 border-purple-500/50 shadow-lg shadow-purple-500/20",
        interactive && "cursor-pointer"
      )}>
        {user.avatar ? (
          <AvatarImage src={user.avatar} alt={displayName} />
        ) : (
          <AvatarFallback className={cn(
            "bg-gradient-to-br text-white font-semibold",
            getGradient(),
            sizeConfig.text
          )}>
            {getInitials()}
          </AvatarFallback>
        )}
      </Avatar>
      
      {/* Status indicator */}
      {showStatus && user.status && (
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-[#0f172a]",
          size === 'xs' ? 'w-2 h-2' : size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3',
          statusColors[user.status],
          user.status === 'online' && 'animate-pulse'
        )} />
      )}
      
      {/* Validated badge */}
      {showBadges && user.isValidated && (
        <div className={cn(
          "absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5",
          size === 'xs' || size === 'sm' ? 'hidden' : ''
        )}>
          <CheckCircle className="h-3 w-3 text-white" />
        </div>
      )}
    </div>
  );

  // Variants de layout
  if (variant === 'compact') {
    return AvatarComponent;
  }

  if (variant === 'card') {
    return (
      <motion.div
        whileHover={interactive ? { scale: 1.02 } : undefined}
        whileTap={interactive ? { scale: 0.98 } : undefined}
        onClick={onClick}
        className={cn(
          "flex flex-col items-center gap-2 p-4",
          "bg-black/40 backdrop-blur-xl rounded-xl",
          "border border-purple-500/30",
          interactive && "cursor-pointer hover:bg-white/5 hover:border-purple-400/50",
          "transition-all duration-200",
          className
        )}
      >
        {AvatarComponent}
        {showName && (
          <p className={cn("font-medium text-white text-center", sizeConfig.text)}>
            {displayName}
          </p>
        )}
        {showRole && displayRole && (
          <p className={cn("text-gray-400 text-center", sizeConfig.role)}>
            {displayRole}
          </p>
        )}
        {showRate && formatRate() && (
          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs">
            {formatRate()}
          </Badge>
        )}
      </motion.div>
    );
  }

  if (variant === 'list') {
    return (
      <motion.div
        whileHover={interactive ? { scale: 1.01 } : undefined}
        whileTap={interactive ? { scale: 0.99 } : undefined}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg",
          interactive && "cursor-pointer hover:bg-white/5",
          "transition-all duration-200",
          className
        )}
      >
        {AvatarComponent}
        <div className="flex-1 min-w-0">
          {showName && (
            <p className={cn("font-medium text-white truncate", sizeConfig.text)}>
              {displayName}
            </p>
          )}
          {showRole && displayRole && (
            <p className={cn("text-gray-400 truncate", sizeConfig.role)}>
              {displayRole}
            </p>
          )}
        </div>
        {showRate && formatRate() && (
          <Badge className="bg-white/10 text-white border-purple-500/30 text-xs">
            {formatRate()}
          </Badge>
        )}
      </motion.div>
    );
  }

  if (variant === 'detailed') {
    return (
      <motion.div
        whileHover={interactive ? { scale: 1.01 } : undefined}
        whileTap={interactive ? { scale: 0.99 } : undefined}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl",
          "bg-black/40 backdrop-blur-xl",
          "border border-purple-500/30",
          interactive && "cursor-pointer hover:bg-white/5 hover:border-purple-400/50",
          "transition-all duration-200",
          className
        )}
      >
        {AvatarComponent}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {showName && (
              <p className={cn("font-medium text-white truncate", sizeConfig.text)}>
                {displayName}
              </p>
            )}
            {showBadges && user.isTeamLead && (
              <Crown className={cn("text-yellow-500", sizeConfig.icon)} />
            )}
          </div>
          {showRole && displayRole && (
            <div className="flex items-center gap-2 mt-0.5">
              <RoleIcon className={cn("text-gray-400", "h-3 w-3")} />
              <p className={cn("text-gray-400 truncate", sizeConfig.role)}>
                {displayRole}
              </p>
            </div>
          )}
          {showBadges && user.seniority && (
            <Badge 
              className={cn(
                "mt-1 text-xs border-0 text-white bg-gradient-to-r",
                getGradient()
              )}
            >
              {user.seniority}
            </Badge>
          )}
        </div>
        {showRate && formatRate() && (
          <div className="text-right">
            <p className="text-xs text-gray-400">Taux</p>
            <p className={cn("font-semibold text-white", sizeConfig.text)}>
              {formatRate()}
            </p>
          </div>
        )}
      </motion.div>
    );
  }

  // Default variant (inline)
  return (
    <motion.div
      whileHover={interactive ? { scale: 1.02 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2",
        interactive && "cursor-pointer",
        className
      )}
    >
      {AvatarComponent}
      {(showName || showRole) && (
        <div className="min-w-0">
          {showName && (
            <p className={cn("font-medium text-white truncate", sizeConfig.text)}>
              {displayName}
            </p>
          )}
          {showRole && displayRole && (
            <p className={cn("text-gray-400 truncate", sizeConfig.role)}>
              {displayRole}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default UserAvatarNeon;