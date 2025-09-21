import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProjectMember {
  id: string; // profile id
  userId: string; // auth.users id for presence tracking
  email: string;
  name: string;
  firstName?: string;
  jobTitle?: string; // métier
  role: 'client' | 'candidate' | 'admin' | 'ia';
  avatar?: string;
  isOnline?: boolean;
  isAI?: boolean; // Indicateur pour les ressources IA
  promptId?: string; // ID du prompt pour les IA
}

export const useProjectMembersForMessaging = (projectId: string) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  console.log('🚀🚀🚀 [MESSAGING HOOK v2] Called with projectId:', projectId);
  console.log('🚀🚀🚀 [MESSAGING HOOK v2] User:', user?.id, user?.email);

  useEffect(() => {
    console.log('🔥🔥🔥 [MESSAGING] useEffect START - projectId:', projectId, 'user:', user?.id);
    
    if (!projectId) {
      console.log('❌ [MESSAGING] Missing projectId, returning');
      setLoading(false);
      return;
    }
    
    if (!user) {
      console.log('❌ [MESSAGING] Missing user, returning');
      setLoading(false);
      return;
    }

    const loadMembers = async () => {
      console.log('🏃 [MESSAGING] loadMembers function starting...');
      console.log('🏃 [MESSAGING] Stack trace:', new Error().stack);
      try {
        setLoading(true);
        console.log('🔍 [MESSAGING] Loading members for project:', projectId);
        console.log('[MESSAGING] Current user:', {
          id: user?.id,
          email: user?.email,
          role: user?.user_metadata?.role
        });
        
        const allMembers: ProjectMember[] = [];

        // 1. Get project owner/client
        const { data: project } = await supabase
          .from('projects')
          .select('owner_id, user_id')
          .eq('id', projectId)
          .single();

        if (project) {
          const clientId = project.owner_id || project.user_id;
          if (clientId) {
            const { data: clientProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', clientId)
              .single();

            if (clientProfile) {
              allMembers.push({
                id: clientProfile.id,
                userId: clientProfile.user_id || clientProfile.id,
                email: clientProfile.email,
                name: clientProfile.first_name || 'Client',
                firstName: clientProfile.first_name,
                jobTitle: 'Client',
                role: 'client',
                isOnline: false
              });
              console.log('Added client:', clientProfile.first_name, 'ID:', clientProfile.id);
            }
          }
        }

        // 2. Get candidates from hr_resource_assignments - USING SECURE FUNCTION
        console.log('[MESSAGING] Fetching assignments for project:', projectId);

        // Utiliser la fonction sécurisée qui contourne les RLS
        const { data: assignments, error: assignError } = await supabase
          .rpc('get_team_assignments', { p_project_id: projectId });

        if (assignError) {
          console.error('[MESSAGING] ❌ Error fetching assignments:', assignError);
        }

        console.log('[MESSAGING] ✅ Assignments query result:', {
          found: assignments?.length || 0,
          assignments: assignments
        });

        if (assignments && assignments.length > 0) {
          console.log('[MESSAGING] Processing assignments...');

          for (const assignment of assignments) {
            // Les données JSONB sont déjà parsées par Supabase
            const hrProfile = assignment.hr_profile || null;
            const candidateProfile = assignment.candidate_profile || null;

            console.log('[MESSAGING] Assignment:', {
              id: assignment.id,
              candidate_id: assignment.candidate_id,
              booking_status: assignment.booking_status,
              hr_profile: hrProfile
            });

            // Check if this is an AI resource first
            const isAI = hrProfile?.is_ai || false;

            if (isAI) {
              // For AI resources, we don't have a real user profile
              // Create a virtual member entry
              const jobTitle = hrProfile?.name || 'IA';
              const promptId = hrProfile?.prompt_id;

              allMembers.push({
                id: `ia_${assignment.profile_id}`,
                userId: `ia_${assignment.profile_id}`,
                email: `${jobTitle.toLowerCase().replace(/\s+/g, '_')}@ia.team`,
                name: `${jobTitle} (IA)`,
                firstName: jobTitle,
                jobTitle: jobTitle,
                role: 'ia',
                isOnline: true, // Les IA sont toujours "en ligne"
                isAI: true,
                promptId: promptId
              });
              console.log('[MESSAGING] Added AI resource:', jobTitle, 'ID:', `ia_${assignment.profile_id}`);
            } else if (assignment.candidate_id) {
              // For human candidates, we have the profile in candidateProfile
              if (candidateProfile) {
                const { data: userProfile } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', assignment.candidate_id)
                  .single();

                if (userProfile) {
                  // Get the job title from hrProfile
                  let jobTitle = 'Ressource';

                  if (hrProfile) {
                    console.log('[MESSAGING] Found hr_profile via function:', hrProfile);
                    jobTitle = hrProfile.name || 'Ressource';
                    console.log('[MESSAGING] Job title set to:', jobTitle);
                  }

                allMembers.push({
                  id: userProfile.id,
                  userId: userProfile.user_id || userProfile.id,
                  email: userProfile.email,
                  name: userProfile.first_name || 'Candidat',
                  firstName: userProfile.first_name,
                  jobTitle: jobTitle,
                  role: 'candidate',
                  isOnline: false,
                  isAI: false
                });

                console.log('[MESSAGING] Added candidate:', userProfile.first_name, 'ID:', userProfile.id, 'Job:', jobTitle);
                }
              } else {
                console.error('[MESSAGING] Could not find profile for candidate_id:', assignment.candidate_id);
              }
            }
          }
        }

        // 3. Also check project_bookings as additional source
        const { data: bookings } = await supabase
          .from('project_bookings')
          .select('candidate_id, status')
          .eq('project_id', projectId)
          .in('status', ['accepted', 'confirmed']);

        console.log('Bookings found:', bookings?.length || 0);

        if (bookings) {
          for (const booking of bookings) {
            if (booking.candidate_id) {
              // Check if we already have this member
              const exists = allMembers.some(m => m.id === booking.candidate_id);
              if (!exists) {
                const { data: profile } = await supabase
                  .from('candidate_profiles')
                  .select('*')
                  .eq('id', booking.candidate_id)
                  .single();
                
                if (profile) {
                  allMembers.push({
                    id: profile.id,
                    userId: profile.id, // Avec l'ID unifié, c'est le même
                    email: profile.email,
                    name: profile.first_name || 'Candidat',
                    firstName: profile.first_name,
                    jobTitle: profile.position || 'Ressource',
                    role: 'candidate',
                    isOnline: false
                  });
                  console.log('Added from bookings:', profile.first_name, 'ID:', profile.id);
                }
              }
            }
          }
        }

        console.log('📊 [MESSAGING] Total members found:', allMembers.length);
        console.log('[MESSAGING] All member details:', allMembers.map(m => ({
          id: m.id,
          name: m.name,
          role: m.role,
          jobTitle: m.jobTitle
        })));
        console.log('[MESSAGING] Current user ID for filtering:', user?.id);
        
        // Remove current user from the list - filter by ID not email!
        // But keep everyone else (including all team members)
        // IMPORTANT: Always show AI resources regardless of user
        const filteredMembers = allMembers.filter(m => {
          // Les ressources IA doivent toujours être visibles pour tous
          if (m.isAI) {
            console.log('[MESSAGING] Keeping AI resource:', m.name, 'ID:', m.id);
            return true;
          }

          // Pour les humains, filtrer l'utilisateur actuel
          const shouldKeep = m.id !== user?.id;
          if (!shouldKeep) {
            console.log('[MESSAGING] Filtering out current user:', m.name, 'ID:', m.id, 'Role:', m.role);
          }
          return shouldKeep;
        });
        
        console.log('📋 [MESSAGING] Final members (without current user):', filteredMembers.length);
        if (filteredMembers.length > 0) {
          console.log('[MESSAGING] Members:', filteredMembers.map(m => `${m.name} (${m.jobTitle})`));
        } else {
          console.log('[MESSAGING] ⚠️ No members found after filtering!');
        }
        setMembers(filteredMembers);
      } catch (error) {
        console.error('Error loading project members:', error);
      } finally {
        setLoading(false);
      }
    };

    // Add a small delay to ensure all dependencies are ready
    const timer = setTimeout(() => {
      console.log('⏰ [MESSAGING] Timer triggered, calling loadMembers');
      loadMembers();
    }, 100);
    
    return () => {
      console.log('🧹 [MESSAGING] Cleanup - clearing timer');
      clearTimeout(timer);
    };
  }, [projectId, user?.id]); // Use user?.id instead of user object

  return { members, loading };
};