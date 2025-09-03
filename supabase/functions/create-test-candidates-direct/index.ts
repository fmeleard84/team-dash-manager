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

    const projectId = '5221da5d-783a-4637-a400-937af8dabaa6';
    console.log(`Creating test candidates for project: ${projectId}`);

    // Get accepted assignments
    const { data: assignments } = await supabaseClient
      .from('hr_resource_assignments')
      .select('*')
      .eq('project_id', projectId)
      .eq('booking_status', 'accepted');

    console.log(`Found ${assignments?.length || 0} accepted assignments`);
    
    const results = [];
    
    for (const assignment of assignments || []) {
      if (!assignment.candidate_id) {
        // Create a test candidate
        const { data: hrProfile } = await supabaseClient
          .from('hr_profiles')
          .select('name')
          .eq('id', assignment.profile_id)
          .single();
        
        const testCandidate = {
          first_name: 'Test',
          last_name: `${hrProfile?.name || 'Resource'} ${assignment.seniority}`,
          email: `test-${assignment.id}@teamdash.com`,
          phone: '+33600000001',
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
        
        if (newCandidate) {
          // Update assignment
          await supabaseClient
            .from('hr_resource_assignments')
            .update({ candidate_id: newCandidate.id })
            .eq('id', assignment.id);
          
          results.push({
            assignment_id: assignment.id,
            candidate: newCandidate,
            status: 'created'
          });
          
          console.log(`Created candidate: ${newCandidate.first_name} ${newCandidate.last_name}`);
        } else {
          console.error(`Failed to create candidate:`, createError);
          results.push({
            assignment_id: assignment.id,
            error: createError?.message,
            status: 'error'
          });
        }
      } else {
        results.push({
          assignment_id: assignment.id,
          candidate_id: assignment.candidate_id,
          status: 'already_exists'
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        project_id: projectId,
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});