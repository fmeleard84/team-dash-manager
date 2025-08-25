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
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const projectId = '16fd6a53-d0ed-49e9-aec6-99813eb23738';
    console.log('🔍 Checking candidates for project:', projectId);

    // 1. Get all assignments
    const { data: assignments, error: assignError } = await supabaseClient
      .from('hr_resource_assignments')
      .select('*')
      .eq('project_id', projectId);

    if (assignError) throw assignError;

    const results = {
      project_id: projectId,
      assignments_found: assignments?.length || 0,
      candidates_checked: [],
      fixes_applied: []
    };

    // 2. Check each assignment
    for (const assignment of assignments || []) {
      console.log('Checking assignment:', assignment.id);
      
      if (assignment.candidate_id) {
        // Check if candidate exists
        const { data: candidate, error: candError } = await supabaseClient
          .from('candidate_profiles')
          .select('*')
          .eq('id', assignment.candidate_id)
          .single();

        if (candError) {
          console.log('Candidate not found, creating from hr_profile...');
          
          // Try to get info from hr_profile
          if (assignment.profile_id) {
            const { data: hrProfile } = await supabaseClient
              .from('hr_profiles')
              .select('*')
              .eq('id', assignment.profile_id)
              .single();

            if (hrProfile) {
              // Create candidate profile
              const email = hrProfile.name?.includes('@') 
                ? hrProfile.name 
                : `${hrProfile.name?.toLowerCase().replace(' ', '.')}@temp.com`;

              const { data: newCandidate, error: createError } = await supabaseClient
                .from('candidate_profiles')
                .insert({
                  id: assignment.candidate_id,
                  email: email,
                  first_name: hrProfile.name?.split(' ')[0] || 'Assistant',
                  last_name: hrProfile.name?.split(' ')[1] || 'Comptable',
                  job_title: assignment.job_title || hrProfile.job_title || 'Consultant',
                  profile_id: assignment.profile_id
                })
                .select()
                .single();

              if (!createError) {
                results.fixes_applied.push({
                  type: 'created_candidate',
                  candidate_id: assignment.candidate_id,
                  email: email
                });
              } else {
                console.error('Error creating candidate:', createError);
              }
            }
          }
        } else {
          results.candidates_checked.push({
            id: candidate.id,
            email: candidate.email,
            name: `${candidate.first_name} ${candidate.last_name}`,
            status: 'exists'
          });
        }
      } else if (assignment.profile_id) {
        // Old system - migrate to candidate
        console.log('Found assignment with only profile_id, migrating...');
        
        const { data: hrProfile } = await supabaseClient
          .from('hr_profiles')
          .select('*')
          .eq('id', assignment.profile_id)
          .single();

        if (hrProfile) {
          const email = hrProfile.name?.includes('@') 
            ? hrProfile.name 
            : `${hrProfile.name?.toLowerCase().replace(' ', '.')}@temp.com`;

          // Check if candidate already exists with this email
          const { data: existingCandidate } = await supabaseClient
            .from('candidate_profiles')
            .select('*')
            .eq('email', email)
            .single();

          if (existingCandidate) {
            // Update assignment to use existing candidate
            await supabaseClient
              .from('hr_resource_assignments')
              .update({ candidate_id: existingCandidate.id })
              .eq('id', assignment.id);

            results.fixes_applied.push({
              type: 'linked_existing_candidate',
              assignment_id: assignment.id,
              candidate_id: existingCandidate.id
            });
          } else {
            // Create new candidate
            const { data: newCandidate } = await supabaseClient
              .from('candidate_profiles')
              .insert({
                email: email,
                first_name: hrProfile.name?.split(' ')[0] || 'Resource',
                last_name: hrProfile.name?.split(' ')[1] || '',
                job_title: assignment.job_title || hrProfile.job_title || 'Consultant',
                profile_id: assignment.profile_id
              })
              .select()
              .single();

            if (newCandidate) {
              // Update assignment
              await supabaseClient
                .from('hr_resource_assignments')
                .update({ candidate_id: newCandidate.id })
                .eq('id', assignment.id);

              results.fixes_applied.push({
                type: 'created_and_linked_candidate',
                assignment_id: assignment.id,
                candidate_id: newCandidate.id,
                email: email
              });
            }
          }
        }
      }
    }

    // 3. Final check - get all project members
    const { data: finalAssignments } = await supabaseClient
      .from('hr_resource_assignments')
      .select(`
        *,
        candidate_profiles(email, first_name, last_name),
        hr_profiles(name)
      `)
      .eq('project_id', projectId);

    results.final_state = finalAssignments?.map(a => ({
      assignment_id: a.id,
      booking_status: a.booking_status,
      has_candidate_id: !!a.candidate_id,
      candidate_email: a.candidate_profiles?.email,
      hr_profile_name: a.hr_profiles?.name
    }));

    return new Response(
      JSON.stringify(results, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})