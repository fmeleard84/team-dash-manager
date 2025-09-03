import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, projectId } = await req.json();
    
    if (!userId || !projectId) {
      throw new Error('userId and projectId are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log(`Debugging storage access for user ${userId} on project ${projectId}`);

    // Check if user is client owner
    const { data: ownerCheck } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .eq('owner_id', userId)
      .maybeSingle();

    // Check if user is candidate with accepted booking
    const { data: candidateCheck } = await supabase
      .from('hr_resource_assignments')
      .select(`
        booking_status,
        candidate_profiles!inner(user_id)
      `)
      .eq('project_id', projectId)
      .eq('candidate_profiles.user_id', userId)
      .eq('booking_status', 'accepted')
      .maybeSingle();

    // Check current RLS policies
    const { data: policies } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, qual, with_check')
      .eq('schemaname', 'storage')
      .eq('tablename', 'objects');

    // Check if RLS is enabled
    const { data: rlsEnabled } = await supabase
      .from('pg_tables')
      .select('rowsecurity')
      .eq('schemaname', 'storage')
      .eq('tablename', 'objects')
      .single();

    const result = {
      userId,
      projectId,
      filePath: `projects/${projectId}/test.png`,
      isOwner: !!ownerCheck,
      isAcceptedCandidate: !!candidateCheck,
      candidateDetails: candidateCheck,
      rlsEnabled: rlsEnabled?.rowsecurity,
      policies: policies || [],
      hasInsertPolicy: policies?.some(p => p.cmd === 'INSERT'),
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(result, null, 2),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in debug-storage-access:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});