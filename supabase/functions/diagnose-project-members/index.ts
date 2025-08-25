import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const projectId = '16fd6a53-d0ed-49e9-aec6-99813eb23738';
    const results: any = {
      project_id: projectId,
      project_title: 'Comptable junior client_2',
      diagnostic: {}
    };

    console.log('🔍 Starting diagnostic for project:', projectId);

    // 1. Get all assignments for this project
    const { data: assignments, error: assignError } = await supabaseClient
      .from('hr_resource_assignments')
      .select(`
        *,
        candidate_profiles(id, email, first_name, last_name),
        hr_profiles(id, name)
      `)
      .eq('project_id', projectId);

    if (assignError) {
      console.error('Error fetching assignments:', assignError);
      results.error = assignError;
    } else {
      results.diagnostic.total_assignments = assignments?.length || 0;
      results.diagnostic.assignments = assignments?.map(a => ({
        id: a.id,
        booking_status: a.booking_status,
        candidate_id: a.candidate_id,
        profile_id: a.profile_id,
        job_title: a.job_title,
        seniority: a.seniority,
        candidate_email: a.candidate_profiles?.email,
        hr_profile_name: a.hr_profiles?.name,
        created_at: a.created_at
      }));

      // Analyze booking statuses
      const statusCount: Record<string, number> = {};
      assignments?.forEach(a => {
        statusCount[a.booking_status] = (statusCount[a.booking_status] || 0) + 1;
      });
      results.diagnostic.status_distribution = statusCount;

      // Find accepted vs searching
      const accepted = assignments?.filter(a => 
        a.booking_status === 'accepted' || a.booking_status === 'booké'
      ) || [];
      const searching = assignments?.filter(a => 
        a.booking_status === 'recherche' || a.booking_status === 'draft'
      ) || [];
      
      results.diagnostic.accepted_count = accepted.length;
      results.diagnostic.searching_count = searching.length;

      // Look for Assistant Comptable
      const assistant = assignments?.find(a => 
        a.job_title?.toLowerCase().includes('assistant') ||
        a.job_title?.toLowerCase().includes('comptable')
      );

      if (assistant) {
        results.diagnostic.assistant_found = true;
        results.diagnostic.assistant_details = {
          job_title: assistant.job_title,
          booking_status: assistant.booking_status,
          has_candidate_id: !!assistant.candidate_id,
          candidate_id: assistant.candidate_id,
          profile_id: assistant.profile_id,
          problem: assistant.booking_status === 'recherche' 
            ? '⚠️ Assistant is in "recherche" status - not accepted!' 
            : assistant.booking_status === 'accepted' || assistant.booking_status === 'booké'
            ? '✅ Assistant is accepted'
            : `❓ Unknown status: ${assistant.booking_status}`
        };
      } else {
        results.diagnostic.assistant_found = false;
      }
    }

    // 2. Get project owner (client)
    const { data: project } = await supabaseClient
      .from('projects')
      .select(`
        id,
        title,
        owner_id,
        profiles!projects_owner_id_fkey(id, email, first_name, last_name)
      `)
      .eq('id', projectId)
      .single();

    if (project) {
      results.diagnostic.client = {
        id: project.owner_id,
        email: project.profiles?.email,
        name: `${project.profiles?.first_name} ${project.profiles?.last_name}`
      };
    }

    // 3. SOLUTION
    results.solution = {
      problem: 'The Assistant Comptable is likely in "recherche" status and needs to be accepted',
      steps: [
        '1. Update booking_status to "accepted" or "booké" for the Assistant',
        '2. Ensure candidate_id is properly set',
        '3. Update useProjectUsers hook to include all valid statuses'
      ],
      sql_fix: `
UPDATE hr_resource_assignments 
SET booking_status = 'accepted'
WHERE project_id = '${projectId}'
  AND job_title LIKE '%Assistant%'
  AND booking_status = 'recherche';
      `
    };

    // 4. Try to fix it automatically if in recherche status
    if (results.diagnostic.assistant_details?.booking_status === 'recherche') {
      console.log('🔧 Attempting to fix Assistant status...');
      
      const { error: updateError } = await supabaseClient
        .from('hr_resource_assignments')
        .update({ booking_status: 'accepted' })
        .eq('project_id', projectId)
        .match({ job_title: 'Assistant comptable' });

      if (!updateError) {
        results.fix_applied = true;
        results.fix_message = '✅ Assistant Comptable status updated to "accepted"';
      } else {
        results.fix_applied = false;
        results.fix_error = updateError;
      }
    }

    return new Response(
      JSON.stringify(results, null, 2),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in diagnose-project-members:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})