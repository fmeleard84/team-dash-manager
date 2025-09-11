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
      {/* Effet glow néon */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-lg opacity-20" />
      
      <Select 
        value={selectedUserId || ''} 
        onValueChange={onUserChange}
        disabled={disabled}
      >
        <SelectTrigger className="relative bg-black/40 backdrop-blur-xl border-purple-500/30 text-white hover:bg-white/10 hover:border-purple-400 transition-all duration-300 shadow-lg shadow-purple-500/20">
          <SelectValue placeholder={placeholder}>
            {selectedUserId === 'all' ? (
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <span className="font-medium">{allLabel}</span>
              </div>
            ) : selectedUser ? (
              <UserAvatarNeon
                user={selectedUser}
                size="xs"
                variant="default"
                showRole={false}
                showStatus={false}
                className="py-0"
              />
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        
        <SelectContent className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] border-purple-500/30 backdrop-blur-xl">
          {showAll && (
            <>
              <SelectItem 
                value="all"
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer group"
              >
                <motion.div 
                  className="flex items-center gap-3 w-full"
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg shadow-purple-500/40">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium">{allLabel}</span>
                </motion.div>
              </SelectItem>
              <div className="my-2 border-t border-purple-500/20" />
            </>
          )}
          
          {users.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <p className="text-sm">Aucun utilisateur disponible</p>
            </div>
          ) : (
            users.map((user) => (
              <SelectItem 
                key={user.id} 
                value={user.id}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer group"
              >
                <motion.div 
                  className="w-full"
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <UserAvatarNeon
                    user={user}
                    size="sm"
                    variant="list"
                    showStatus={true}
                    showRole={true}
                    className="w-full"
                  />
                </motion.div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default UserSelectNeon;