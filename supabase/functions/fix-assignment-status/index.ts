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
    
    console.log('🔧 Fixing assignment statuses for project:', projectId);

    // 1. Get all assignments that are in 'recherche' status
    const { data: assignments, error: fetchError } = await supabaseClient
      .from('hr_resource_assignments')
      .select('*')
      .eq('project_id', projectId)
      .eq('booking_status', 'recherche');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${assignments?.length || 0} assignments in 'recherche' status`);

    // 2. Update them to 'accepted'
    if (assignments && assignments.length > 0) {
      const { error: updateError } = await supabaseClient
        .from('hr_resource_assignments')
        .update({ booking_status: 'accepted' })
        .eq('project_id', projectId)
        .eq('booking_status', 'recherche');

      if (updateError) {
        throw updateError;
      }

      console.log(`✅ Updated ${assignments.length} assignments to 'accepted' status`);
    }

    // 3. Get final state
    const { data: finalAssignments } = await supabaseClient
      .from('hr_resource_assignments')
      .select(`
        *,
        candidate_profiles(email, first_name, last_name),
        hr_profiles(name)
      `)
      .eq('project_id', projectId);

    const result = {
      message: `Fixed ${assignments?.length || 0} assignments`,
      updated_count: assignments?.length || 0,
      final_assignments: finalAssignments?.map(a => ({
        id: a.id,
        booking_status: a.booking_status,
        job_title: a.job_title,
        candidate_email: a.candidate_profiles?.email,
        hr_profile_name: a.hr_profiles?.name
      }))
    };

    return new Response(
      JSON.stringify(result, null, 2),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in fix-assignment-status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})