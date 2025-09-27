import React from 'react';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserAvatarNeon, type UserData } from '@/components/ui/user-avatar-neon';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

interface UserSelectNeonProps {
  users: UserData[];
  selectedUserId?: string;
  onUserChange: (userId: string) => void;
  placeholder?: string;
  className?: string;
  showAll?: boolean;
  allLabel?: string;
  disabled?: boolean;
}

export const UserSelectNeon: React.FC<UserSelectNeonProps> = ({
  users,
  selectedUserId,
  onUserChange,
  placeholder = "Sélectionner un utilisateur",
  className,
  showAll = false,
  allLabel = "Tous les utilisateurs",
  disabled = false
}) => {
  const selectedUser = selectedUserId && selectedUserId !== 'all' 
    ? users.find(u => u.id === selectedUserId) 
    : null;

  return (
    <div className={cn("relative", className)}>
      {/* Effet glow néon Material Design */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl blur-lg opacity-20 dark:opacity-30" />

      <Select
        value={selectedUserId || ''}
        onValueChange={onUserChange}
        disabled={disabled}
      >
        <SelectTrigger className="
          relative
          bg-white dark:bg-neutral-900/80
          backdrop-blur-xl
          border border-neutral-200 dark:border-neutral-700
          text-neutral-900 dark:text-white
          hover:bg-neutral-50 dark:hover:bg-neutral-800/80
          hover:border-primary-500 dark:hover:border-primary-400
          focus:border-primary-500 dark:focus:border-primary-400
          focus:ring-2 focus:ring-primary-500/20
          transition-all duration-200
          shadow-lg dark:shadow-xl dark:shadow-primary-500/10
          disabled:opacity-50 disabled:cursor-not-allowed
        ">
          <SelectValue placeholder={placeholder}>
            {selectedUserId === 'all' ? (
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg shadow-sm">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <span className="font-medium text-neutral-900 dark:text-white">{allLabel}</span>
              </div>
            ) : selectedUser ? (
              <div className="flex items-center gap-2">
                <UserAvatarNeon
                  user={selectedUser}
                  size="xs"
                  variant="compact"
                  showRole={false}
                  showStatus={false}
                  showName={false}
                />
                <div className="flex flex-col items-start">
                  <span className="font-medium text-neutral-900 dark:text-white text-sm">
                    {selectedUser.name || selectedUser.firstName || 'Utilisateur'}
                  </span>
                  {selectedUser.role && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {selectedUser.role}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-neutral-500 dark:text-neutral-400">{placeholder}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        
        <SelectContent className="
          bg-white dark:bg-gradient-to-br dark:from-neutral-900 dark:via-neutral-900/95 dark:to-neutral-950
          border border-neutral-200 dark:border-neutral-700
          backdrop-blur-xl
          shadow-xl dark:shadow-2xl dark:shadow-primary-500/10
        ">
          {showAll && (
            <>
              <SelectItem
                value="all"
                className="
                  text-neutral-900 dark:text-white
                  hover:bg-neutral-100 dark:hover:bg-white/10
                  focus:bg-neutral-100 dark:focus:bg-white/10
                  cursor-pointer group
                  transition-colors duration-200
                "
              >
                <motion.div 
                  className="flex items-center gap-3 w-full"
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-1.5 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg shadow-sm">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium text-neutral-900 dark:text-white">{allLabel}</span>
                </motion.div>
              </SelectItem>
              <div className="my-2 border-t border-neutral-200 dark:border-neutral-700/50" />
            </>
          )}
          
          {users.length === 0 ? (
            <div className="p-4 text-center text-neutral-500 dark:text-neutral-400">
              <p className="text-sm">Aucun utilisateur disponible</p>
            </div>
          ) : (
            users.map((user) => {
              // Générer les initiales
              const getInitials = () => {
                if (user.firstName && user.lastName) {
                  return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
                }
                if (user.name) {
                  const parts = user.name.split(' ');
                  if (parts.length > 1) {
                    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
                  }
                  return user.name.substring(0, 2).toUpperCase();
                }
                return 'US';
              };

              const initials = getInitials();
              const charCode = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0);

              const gradients = [
                'from-purple-500 to-pink-500',
                'from-blue-500 to-cyan-500',
                'from-green-500 to-emerald-500',
                'from-orange-500 to-red-500',
                'from-indigo-500 to-purple-500',
                'from-teal-500 to-green-500',
                'from-rose-500 to-pink-500',
                'from-amber-500 to-orange-500'
              ];

              const gradient = gradients[charCode % gradients.length];

              return (
                <SelectItem
                  key={user.id}
                  value={user.id}
                  className="
                    text-neutral-900 dark:text-white
                    hover:bg-neutral-100 dark:hover:bg-white/10
                    focus:bg-neutral-100 dark:focus:bg-white/10
                    cursor-pointer group
                    transition-colors duration-200
                  "
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="relative">
                      <div className={`
                        w-8 h-8 rounded-full
                        bg-gradient-to-br ${gradient}
                        flex items-center justify-center
                        text-white font-bold text-xs
                        shadow-sm
                      `}>
                        {initials}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {user.name || user.firstName || 'Utilisateur'}
                      </div>
                      {user.role && (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {user.role}
                        </div>
                      )}
                    </div>
                  </div>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default UserSelectNeon;