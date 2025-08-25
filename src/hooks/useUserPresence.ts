import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
}

export const useUserPresence = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<any>();

  // Update our own presence
  const updateMyPresence = async (isOnline: boolean) => {
    if (!user?.id) return;

    try {
      const { data: existing } = await supabase
        .from('user_presence')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Update existing record
        await supabase
          .from('user_presence')
          .update({
            is_online: isOnline,
            last_seen: new Date().toISOString()
          })
          .eq('user_id', user.id);
      } else {
        // Insert new record
        await supabase
          .from('user_presence')
          .insert({
            user_id: user.id,
            is_online: isOnline,
            last_seen: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  };

  // Load all online users
  const loadOnlineUsers = async () => {
    try {
      const { data } = await supabase
        .from('user_presence')
        .select('user_id')
        .eq('is_online', true)
        .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Active in last 5 minutes

      if (data) {
        setOnlineUsers(new Set(data.map(p => p.user_id)));
      }
    } catch (error) {
      console.error('Error loading online users:', error);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    // Set user as online when component mounts
    updateMyPresence(true);
    loadOnlineUsers();

    // Heartbeat to keep presence alive
    intervalRef.current = setInterval(() => {
      updateMyPresence(true);
    }, 30000); // Every 30 seconds

    // Subscribe to realtime changes
    channelRef.current = supabase
      .channel('presence-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const presence = payload.new as any;
            setOnlineUsers(prev => {
              const newSet = new Set(prev);
              if (presence.is_online) {
                newSet.add(presence.user_id);
              } else {
                newSet.delete(presence.user_id);
              }
              return newSet;
            });
          } else if (payload.eventType === 'DELETE') {
            const presence = payload.old as any;
            setOnlineUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(presence.user_id);
              return newSet;
            });
          }
        }
      )
      .subscribe();

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateMyPresence(false);
      } else {
        updateMyPresence(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle before unload
    const handleBeforeUnload = () => {
      updateMyPresence(false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      updateMyPresence(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id]);

  const isUserOnline = (userId: string): boolean => {
    return onlineUsers.has(userId);
  };

  return {
    onlineUsers,
    isUserOnline,
    updateMyPresence
  };
};