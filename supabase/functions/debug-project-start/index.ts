import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { projectId } = await req.json();
    console.log(`[debug-project-start] Checking project: ${projectId}`);

    // 1. Get project details
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error(`Project not found: ${projectError?.message}`);
    }

    console.log(`[debug-project-start] Project:`, {
      id: project.id,
      title: project.title,
      status: project.status,
      owner_id: project.owner_id
    });

    // 2. Get resource assignments
    const { data: assignments, error: assignmentsError } = await supabaseClient
      .from('hr_resource_assignments')
      .select(`
        id,
        profile_id,
        seniority,
        booking_status,
        candidate_id,
        hr_profiles!inner(
          id,
          name,
          category_id,
          hr_categories(name)
        )
      `)
      .eq('project_id', projectId);

    if (assignmentsError) {
      throw new Error(`Error fetching assignments: ${assignmentsError.message}`);
    }

    console.log(`[debug-project-start] Found ${assignments?.length || 0} assignments`);
    
    // 3. Check each assignment
    const assignmentDetails = [];
    for (const assignment of assignments || []) {
      console.log(`[debug-project-start] Assignment ${assignment.id}:`, {
        profile_id: assignment.profile_id,
        seniority: assignment.seniority,
        booking_status: assignment.booking_status,
        candidate_id: assignment.candidate_id,
        profile_name: assignment.hr_profiles?.name
      });

      // Try to find the candidate
      let candidateInfo = null;
      
      if (assignment.candidate_id) {
        // Look up by candidate_id
        const { data: candidate } = await supabaseClient
          .from('candidate_profiles')
          .select('id, first_name, last_name, email, status, profile_id, seniority')
          .eq('id', assignment.candidate_id)
          .single();
        
        if (candidate) {
          candidateInfo = candidate;
          console.log(`[debug-project-start] Found candidate by ID:`, candidate);
        } else {
          console.log(`[debug-project-start] WARNING: candidate_id ${assignment.candidate_id} not found in candidate_profiles!`);
        }
      } else {
        // Try to find by profile and seniority
        const { data: candidates } = await supabaseClient
          .from('candidate_profiles')
          .select('id, first_name, last_name, email, status, profile_id, seniority')
          .eq('profile_id', assignment.profile_id)
          .eq('seniority', assignment.seniority);
        
        console.log(`[debug-project-start] Found ${candidates?.length || 0} candidates matching profile ${assignment.profile_id} and seniority ${assignment.seniority}`);
        
        if (candidates && candidates.length > 0) {
          candidateInfo = candidates[0];
          console.log(`[debug-project-start] Using first matching candidate:`, candidateInfo);
        }
      }

      assignmentDetails.push({
        assignment: assignment,
        candidate: candidateInfo,
        issue: !candidateInfo ? 'NO_CANDIDATE_FOUND' : null
      });
    }

    // 4. Check if project can start
    const acceptedAssignments = assignments?.filter(a => a.booking_status === 'accepted') || [];
    const canStart = acceptedAssignments.length > 0;
    const candidatesFound = assignmentDetails.filter(d => d.candidate).length;

    const result = {
      project: {
        id: project.id,
        title: project.title,
        status: project.status
      },
      stats: {
        totalAssignments: assignments?.length || 0,
        acceptedAssignments: acceptedAssignments.length,
        candidatesFound: candidatesFound,
        canStart: canStart,
        readyForOrchestrator: canStart && candidatesFound > 0
      },
      assignments: assignmentDetails,
      issues: assignmentDetails.filter(d => d.issue).map(d => d.issue)
    };

    console.log(`[debug-project-start] Summary:`, result.stats);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[debug-project-start] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});