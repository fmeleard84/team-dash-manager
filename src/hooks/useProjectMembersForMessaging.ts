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

        // 2. Get candidates from hr_resource_assignments - WITHOUT JOIN
        console.log('[MESSAGING] Fetching assignments for project:', projectId);
        
        const { data: assignments, error: assignError } = await supabase
          .from('hr_resource_assignments')
          .select('*')
          .eq('project_id', projectId)
          .in('booking_status', ['accepted', 'completed']);
        
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
            console.log('[MESSAGING] Assignment:', {
              id: assignment.id,
              candidate_id: assignment.candidate_id,
              booking_status: assignment.booking_status
            });
            
            // Vérifier d'abord si c'est une ressource IA
            const { data: hrProfile } = await supabase
              .from('hr_profiles')
              .select('id, name, is_ai, prompt_id')
              .eq('id', assignment.profile_id)
              .single();

            if (hrProfile?.is_ai) {
              // C'est une ressource IA, l'ajouter directement sans candidate_id
              allMembers.push({
                id: `ia_${hrProfile.id}`, // ID unique pour l'IA
                userId: `ia_${hrProfile.id}`, // Même ID pour tracking
                email: `${hrProfile.name.toLowerCase().replace(/\s+/g, '_')}@ia.team`,
                name: hrProfile.name,
                firstName: hrProfile.name,
                jobTitle: hrProfile.name,
                role: 'ia',
                isOnline: true, // Les IA sont toujours "en ligne"
                isAI: true,
                promptId: hrProfile.prompt_id
              });
              console.log('[MESSAGING] Added AI resource:', hrProfile.name, 'ID:', hrProfile.id);
            } else if (assignment.candidate_id) {
              // With unified IDs, candidate_id = profiles.id
              const { data: userProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', assignment.candidate_id)
                .single();
              
              if (userProfile) {
                // Get the job title from hr_profiles separately
                let jobTitle = 'Ressource';
                let isAI = false;
                let promptId = undefined;

                if (assignment.profile_id) {
                  console.log('[MESSAGING] Fetching hr_profile for profile_id:', assignment.profile_id);
                  const { data: hrProfile, error: hrError } = await supabase
                    .from('hr_profiles')
                    .select('name, is_ai, prompt_id')
                    .eq('id', assignment.profile_id)
                    .single();

                  if (hrError) {
                    console.error('[MESSAGING] Error fetching hr_profile:', hrError);
                  }

                  if (hrProfile) {
                    console.log('[MESSAGING] Found hr_profile:', hrProfile);
                    jobTitle = hrProfile.name || 'Ressource';
                    isAI = hrProfile.is_ai || false;
                    promptId = hrProfile.prompt_id;
                    console.log('[MESSAGING] Job title set to:', jobTitle, 'Is AI:', isAI);
                  } else {
                    console.log('[MESSAGING] No hr_profile found for profile_id:', assignment.profile_id);
                  }
                } else {
                  console.log('[MESSAGING] No profile_id in assignment');
                }

                allMembers.push({
                  id: userProfile.id,
                  userId: userProfile.user_id || userProfile.id,
                  email: userProfile.email,
                  name: userProfile.first_name || 'Candidat',
                  firstName: userProfile.first_name,
                  jobTitle: jobTitle,
                  role: isAI ? 'ia' : 'candidate',
                  isOnline: false,
                  isAI: isAI,
                  promptId: promptId
                });
                
                console.log('[MESSAGING] Added candidate:', userProfile.first_name, 'ID:', userProfile.id, 'Job:', jobTitle);
              } else {
                console.error('[MESSAGING] Could not find profile for candidate_id:', assignment.candidate_id);
              }
            }
            // Fallback: try to get candidate from profile in assignment
            else {
              console.log('No candidate_id, checking for other identifiers...');
              
              // Try to find candidate by profile_id and seniority
              if (assignment.profile_id && assignment.seniority) {
                console.log('Searching by profile_id:', assignment.profile_id, 'and seniority:', assignment.seniority);
                
                const { data: candidates } = await supabase
                  .from('candidate_profiles')
                  .select('*')
                  .eq('profile_id', assignment.profile_id)
                  .eq('seniority', assignment.seniority);
                
                if (candidates && candidates.length > 0) {
                  const candidate = candidates[0];
                  console.log('Found candidate by profile/seniority:', candidate.first_name);
                  
                  // Get the user profile
                  const { data: userProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', candidate.id) // Using unified ID
                    .single();
                  
                  if (userProfile) {
                    // Get job title from hr_profiles separately
                    let jobTitle = candidate.position || 'Ressource';
                    if (assignment.profile_id) {
                      const { data: hrProfile } = await supabase
                        .from('hr_profiles')
                        .select('name')
                        .eq('id', assignment.profile_id)
                        .single();
                      
                      if (hrProfile) {
                        jobTitle = hrProfile.name || jobTitle;
                      }
                    }
                    
                    allMembers.push({
                      id: userProfile.id,
                      userId: userProfile.user_id || userProfile.id,
                      email: userProfile.email,
                      name: userProfile.first_name || candidate.first_name || 'Candidat',
                      firstName: userProfile.first_name || candidate.first_name,
                      jobTitle: jobTitle,
                      role: 'candidate',
                      isOnline: false
                    });
                    console.log('Added candidate (fallback):', userProfile.first_name, 'ID:', userProfile.id);
                  }
                }
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
        const filteredMembers = allMembers.filter(m => {
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