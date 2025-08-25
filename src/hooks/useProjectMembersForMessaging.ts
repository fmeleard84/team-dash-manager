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
  role: 'client' | 'candidate' | 'admin';
  avatar?: string;
  isOnline?: boolean;
}

export const useProjectMembersForMessaging = (projectId: string) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const loadMembers = async () => {
      try {
        setLoading(true);
        console.log('🔍 Loading members for project:', projectId);
        console.log('Current user ID:', user?.id);
        
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

        // 2. Get candidates from hr_resource_assignments (same as Kanban)
        const { data: assignments, error: assignError } = await supabase
          .from('hr_resource_assignments')
          .select('*')
          .eq('project_id', projectId);
        
        console.log('Assignments found:', assignments?.length || 0);
        
        if (assignments) {
          for (const assignment of assignments) {
            // Get candidate profile if candidate_id exists
            if (assignment.candidate_id) {
              const { data: candidate } = await supabase
                .from('candidate_profiles')
                .select('*')
                .eq('id', assignment.candidate_id)
                .single();
              
              if (candidate) {
                // Get the user profile for this candidate
                const { data: userProfile } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('email', candidate.email)
                  .single();
                
                if (userProfile) {
                  const jobTitle = assignment.job_title || 
                                   candidate.position || 
                                   'Assistant comptable';
                  
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
                  console.log('Added candidate:', userProfile.first_name, 'ID:', userProfile.id);
                }
              }
            }
            // Fallback to profile_id (old system)
            else if (assignment.profile_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', assignment.profile_id)
                .single();
              
              if (profile) {
                // Get position from candidate_profiles
                const { data: candidateProfile } = await supabase
                  .from('candidate_profiles')
                  .select('position')
                  .eq('email', profile.email)
                  .single();
                
                const jobTitle = assignment.job_title || 
                                candidateProfile?.position || 
                                'Assistant comptable';
                
                allMembers.push({
                  id: profile.id,
                  userId: profile.user_id || profile.id,
                  email: profile.email,
                  name: profile.first_name || 'Candidat',
                  firstName: profile.first_name,
                  jobTitle: jobTitle,
                  role: 'candidate',
                  isOnline: false
                });
                console.log('Added candidate (from profile_id):', profile.first_name, 'ID:', profile.id);
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
                  .from('profiles')
                  .select('*')
                  .eq('id', booking.candidate_id)
                  .single();
                
                if (profile) {
                  // Get position from candidate_profiles
                  const { data: candidateProfile } = await supabase
                    .from('candidate_profiles')
                    .select('position')
                    .eq('email', profile.email)
                    .single();
                  
                  allMembers.push({
                    id: profile.id,
                    userId: profile.user_id || profile.id,
                    email: profile.email,
                    name: profile.first_name || 'Candidat',
                    firstName: profile.first_name,
                    jobTitle: candidateProfile?.position || 'Ressource',
                    role: 'candidate',
                    isOnline: false
                  });
                  console.log('Added from bookings:', profile.first_name, 'ID:', profile.id);
                }
              }
            }
          }
        }

        console.log('📊 Total members found:', allMembers.length);
        console.log('All member IDs:', allMembers.map(m => m.id));
        
        // Remove current user from the list - filter by ID not email!
        const filteredMembers = allMembers.filter(m => m.id !== user?.id);
        
        console.log('📋 Filtered members (without current user):', filteredMembers.length);
        console.log('Filtered member names:', filteredMembers.map(m => m.name));
        setMembers(filteredMembers);
      } catch (error) {
        console.error('Error loading project members:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [projectId, user]);

  return { members, loading };
};