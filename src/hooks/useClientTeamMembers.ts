import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ClientTeamMember {
  id: string;
  client_id: string;
  job_title: string;
  first_name: string;
  last_name: string;
  email: string;
  description?: string;
  is_billable: boolean;
  daily_rate: number | null;
  created_at: string;
  updated_at: string;
}

export function useClientTeamMembers() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<ClientTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamMembers = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('client_team_members')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        // If table doesn't exist, just return empty array
        if (fetchError.code === '42P01') {
          console.log('Team members table does not exist yet');
          setTeamMembers([]);
        } else {
          console.error('Error fetching team members:', fetchError);
          setError(fetchError.message);
        }
      } else {
        setTeamMembers(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Une erreur inattendue s\'est produite');
    } finally {
      setLoading(false);
    }
  };

  const addTeamMember = async (member: Omit<ClientTeamMember, 'id' | 'client_id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('client_team_members')
      .insert({
        ...member,
        client_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    
    setTeamMembers(prev => [data, ...prev]);
    return data;
  };

  const updateTeamMember = async (id: string, updates: Partial<ClientTeamMember>) => {
    const { data, error } = await supabase
      .from('client_team_members')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    setTeamMembers(prev => prev.map(m => m.id === id ? data : m));
    return data;
  };

  const deleteTeamMember = async (id: string) => {
    const { error } = await supabase
      .from('client_team_members')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    setTeamMembers(prev => prev.filter(m => m.id !== id));
  };

  useEffect(() => {
    if (!user?.id) return;
    
    fetchTeamMembers();

    // Set up realtime subscription
    console.log('Setting up realtime subscription for user:', user.id);
    
    const channel = supabase
      .channel(`client_team_members_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_team_members',
          filter: `client_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Team member realtime change:', payload);
          
          if (payload.eventType === 'INSERT') {
            console.log('➕ Adding new team member to list');
            setTeamMembers(prev => {
              // Check if already exists to avoid duplicates
              if (prev.some(m => m.id === payload.new.id)) {
                return prev;
              }
              return [payload.new as ClientTeamMember, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ Updating team member');
            setTeamMembers(prev => prev.map(m => 
              m.id === payload.new.id ? payload.new as ClientTeamMember : m
            ));
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ Removing team member');
            setTeamMembers(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    teamMembers,
    loading,
    error,
    refetch: fetchTeamMembers,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember
  };
}