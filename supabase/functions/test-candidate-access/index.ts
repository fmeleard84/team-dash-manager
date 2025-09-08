import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Client admin pour bypass RLS
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const candidateId = '7f24d9c5-54eb-4185-815b-79daf6cdf4da';
    const projectId = '4ec0b104-2fef-4f3c-be22-9e504903fc75'; // test1217
    
    console.log('=== TEST ACCÈS CANDIDAT AUX PROJETS ===');
    
    // 1. Vérifier que le projet existe
    const { data: project } = await adminClient
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
      
    console.log('Projet:', project?.title);
    
    // 2. Vérifier les assignations
    const { data: assignments } = await adminClient
      .from('hr_resource_assignments')
      .select('*')
      .eq('project_id', projectId);
      
    console.log('Assignations:', assignments?.length);
    
    // 3. Vérifier le profil du candidat
    const { data: candidate } = await adminClient
      .from('candidate_profiles')
      .select('*')
      .eq('id', candidateId)
      .single();
      
    console.log('Candidat:', candidate?.email);
    
    // 4. Simuler la requête avec l'auth du candidat
    // Pour cela, on doit vérifier manuellement les conditions RLS
    
    let canSeeProject = false;
    let reason = '';
    
    // Vérifier si le candidat est owner (non, c'est un candidat)
    if (project?.owner_id === candidateId) {
      canSeeProject = true;
      reason = 'Est propriétaire';
    }
    
    // Vérifier si le candidat a une assignation
    if (!canSeeProject && assignments) {
      for (const assignment of assignments) {
        // Directement assigné
        if (assignment.candidate_id === candidateId) {
          canSeeProject = true;
          reason = 'Directement assigné';
          break;
        }
        
        // En recherche et matche le profil
        if (assignment.booking_status === 'recherche' &&
            assignment.profile_id === candidate?.profile_id &&
            assignment.seniority === candidate?.seniority &&
            candidate?.status !== 'qualification') {
          canSeeProject = true;
          reason = 'Matche le profil (recherche)';
          break;
        }
      }
    }
    
    // 5. Tester la jointure depuis hr_resource_assignments
    const { data: assignmentsWithProjects, error: joinError } = await adminClient
      .from('hr_resource_assignments')
      .select(`
        *,
        projects (
          id,
          title,
          status
        )
      `)
      .or(`candidate_id.eq.${candidateId},booking_status.eq.recherche`);
      
    const projectsFromAssignments = assignmentsWithProjects
      ?.filter(a => a.projects)
      .map(a => a.projects.title);
    
    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          project: {
            exists: !!project,
            title: project?.title,
            id: project?.id,
            owner_id: project?.owner_id
          },
          candidate: {
            id: candidate?.id,
            email: candidate?.email,
            profile_id: candidate?.profile_id,
            seniority: candidate?.seniority,
            status: candidate?.status
          },
          assignments: assignments?.map(a => ({
            id: a.id,
            profile_id: a.profile_id,
            seniority: a.seniority,
            booking_status: a.booking_status,
            candidate_id: a.candidate_id,
            matchesCandidate: a.profile_id === candidate?.profile_id && 
                             a.seniority === candidate?.seniority
          })),
          rlsCheck: {
            canSeeProject,
            reason
          },
          joinTest: {
            error: joinError?.message,
            projectsFound: projectsFromAssignments || []
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});