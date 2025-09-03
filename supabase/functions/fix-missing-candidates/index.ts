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
    console.log(`[fix-missing-candidates] Checking project: ${projectId}`);

    // Get all accepted assignments for this project
    const { data: assignments, error: assignmentsError } = await supabaseClient
      .from('hr_resource_assignments')
      .select('*')
      .eq('project_id', projectId)
      .eq('booking_status', 'accepted');

    if (assignmentsError) {
      throw new Error(`Error fetching assignments: ${assignmentsError.message}`);
    }

    console.log(`[fix-missing-candidates] Found ${assignments?.length || 0} accepted assignments`);
    
    const created = [];
    const found = [];
    const errors = [];
    
    for (const assignment of assignments || []) {
      // Check if candidate_id is set
      if (assignment.candidate_id) {
        // Check if candidate exists
        const { data: candidate } = await supabaseClient
          .from('candidate_profiles')
          .select('id, first_name, last_name, email')
          .eq('id', assignment.candidate_id)
          .single();
        
        if (candidate) {
          console.log(`[fix-missing-candidates] ✅ Candidate exists: ${candidate.first_name} ${candidate.last_name}`);
          found.push(candidate);
        } else {
          console.log(`[fix-missing-candidates] ❌ Candidate ${assignment.candidate_id} not found!`);
          errors.push(`Candidate ID ${assignment.candidate_id} not found in candidate_profiles`);
        }
      } else {
        // No candidate_id, try to find or create one
        console.log(`[fix-missing-candidates] Assignment ${assignment.id} has no candidate_id`);
        
        // First try to find an existing candidate
        const { data: candidates } = await supabaseClient
          .from('candidate_profiles')
          .select('*')
          .eq('profile_id', assignment.profile_id)
          .eq('seniority', assignment.seniority)
          .eq('status', 'disponible');
        
        if (candidates && candidates.length > 0) {
          const candidate = candidates[0];
          console.log(`[fix-missing-candidates] Found existing candidate: ${candidate.first_name} ${candidate.last_name}`);
          
          // Update assignment with candidate_id
          const { error: updateError } = await supabaseClient
            .from('hr_resource_assignments')
            .update({ candidate_id: candidate.id })
            .eq('id', assignment.id);
          
          if (!updateError) {
            console.log(`[fix-missing-candidates] Updated assignment ${assignment.id} with candidate_id ${candidate.id}`);
            found.push(candidate);
          } else {
            errors.push(`Failed to update assignment: ${updateError.message}`);
          }
        } else {
          // Create a test candidate
          const { data: hrProfile } = await supabaseClient
            .from('hr_profiles')
            .select('name')
            .eq('id', assignment.profile_id)
            .single();
          
          const testCandidate = {
            first_name: 'Test',
            last_name: `${hrProfile?.name || 'Resource'} ${assignment.seniority}`,
            email: `test-${assignment.id}@example.com`,
            phone: '+33600000000',
            profile_id: assignment.profile_id,
            seniority: assignment.seniority,
            status: 'disponible',
            is_email_verified: true
          };
          
          const { data: newCandidate, error: createError } = await supabaseClient
            .from('candidate_profiles')
            .insert(testCandidate)
            .select()
            .single();
          
          if (newCandidate && !createError) {
            console.log(`[fix-missing-candidates] Created test candidate: ${newCandidate.first_name} ${newCandidate.last_name}`);
            
            // Update assignment with new candidate_id
            const { error: updateError } = await supabaseClient
              .from('hr_resource_assignments')
              .update({ candidate_id: newCandidate.id })
              .eq('id', assignment.id);
            
            if (!updateError) {
              console.log(`[fix-missing-candidates] Updated assignment ${assignment.id} with new candidate_id ${newCandidate.id}`);
              created.push(newCandidate);
            } else {
              errors.push(`Failed to update assignment: ${updateError.message}`);
            }
          } else {
            errors.push(`Failed to create candidate: ${createError?.message}`);
          }
        }
      }
    }

    const result = {
      success: true,
      stats: {
        totalAssignments: assignments?.length || 0,
        candidatesFound: found.length,
        candidatesCreated: created.length,
        errors: errors.length
      },
      found,
      created,
      errors
    };

    console.log(`[fix-missing-candidates] Summary:`, result.stats);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[fix-missing-candidates] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});