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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const candidateId = '7f24d9c5-54eb-4185-815b-79daf6cdf4da';
    
    // 1. Récupérer TOUS les projets
    const { data: allProjects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (projectsError) {
      console.error('Erreur projets:', projectsError);
    }
    
    // 2. Récupérer le candidat
    const { data: candidate } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', candidateId)
      .single();
    
    // 3. Récupérer TOUTES les assignations
    const { data: allAssignments } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        projects(title, status)
      `)
      .order('created_at', { ascending: false });
    
    // 4. Filtrer les projets spécifiques
    const targetProjects = ['1233', 'test1217', 'test1155'];
    const foundProjects = allProjects?.filter(p => targetProjects.includes(p.title)) || [];
    
    // 5. Pour chaque projet trouvé, vérifier les assignations
    const projectAnalysis = [];
    
    for (const project of foundProjects) {
      const projectAssignments = allAssignments?.filter(a => a.project_id === project.id) || [];
      
      // Vérifier le matching avec le candidat
      const matchingAssignments = projectAssignments.filter(a => {
        const profileMatch = a.profile_id === candidate?.profile_id;
        const seniorityMatch = a.seniority === candidate?.seniority;
        const statusOk = a.booking_status === 'recherche' || a.candidate_id === candidateId;
        
        return profileMatch && seniorityMatch && statusOk;
      });
      
      projectAnalysis.push({
        title: project.title,
        id: project.id,
        status: project.status,
        owner_id: project.owner_id,
        totalAssignments: projectAssignments.length,
        matchingAssignments: matchingAssignments.length,
        assignments: projectAssignments.map(a => ({
          profile_id: a.profile_id,
          seniority: a.seniority,
          booking_status: a.booking_status,
          candidate_id: a.candidate_id,
          matches: a.profile_id === candidate?.profile_id && a.seniority === candidate?.seniority
        }))
      });
    }
    
    // 6. Vérifier pourquoi le candidat ne voit pas les projets
    const visibilityIssues = [];
    
    for (const analysis of projectAnalysis) {
      const issues = [];
      
      if (analysis.totalAssignments === 0) {
        issues.push('Aucune assignation créée');
      }
      
      if (analysis.matchingAssignments === 0 && analysis.totalAssignments > 0) {
        issues.push('Aucune assignation ne matche le profil du candidat');
      }
      
      if (analysis.status !== 'play' && analysis.status !== 'pause' && analysis.status !== 'attente-team') {
        issues.push(`Status invalide: ${analysis.status}`);
      }
      
      if (issues.length > 0) {
        visibilityIssues.push({
          project: analysis.title,
          issues
        });
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalProjects: allProjects?.length || 0,
          targetProjectsFound: foundProjects.length,
          candidateProfile: candidate ? {
            id: candidate.id,
            email: candidate.email,
            profile_id: candidate.profile_id,
            seniority: candidate.seniority,
            status: candidate.status
          } : null,
          projectAnalysis,
          visibilityIssues,
          allProjectTitles: allProjects?.map(p => p.title) || []
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