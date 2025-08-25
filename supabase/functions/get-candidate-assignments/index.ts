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
    const { profileId } = await req.json()
    
    if (!profileId) {
      return new Response(
        JSON.stringify({ error: 'profile_id required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 Récupération assignments pour profile_id:', profileId)
    
    // Requête avec service role pour bypass RLS
    const { data: availableAssignments, error: assignmentsError } = await supabaseClient
      .from('hr_resource_assignments')
      .select(`
        project_id,
        booking_status,
        languages,
        expertises,
        seniority,
        projects (
          id,
          title,
          description,
          status,
          project_date,
          due_date,
          client_budget
        )
      `)
      .eq('profile_id', profileId)
      .in('booking_status', ['recherche', 'pending']);

    console.log('✅ Assignments trouvés:', availableAssignments?.length || 0);
    
    if (assignmentsError) {
      console.error('❌ Erreur assignments:', assignmentsError);
      return new Response(
        JSON.stringify({ error: assignmentsError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Filtrer les projets disponibles (en cours de constitution d'équipe ou actifs)
    const activeAssignments = (availableAssignments || []).filter(assignment => 
      assignment.projects && ['play', 'pause', 'nouveaux', 'attente-team'].includes(assignment.projects.status)
    );

    console.log('✅ Assignments disponibles:', activeAssignments.length);

    return new Response(
      JSON.stringify({
        success: true,
        assignments: activeAssignments,
        total: activeAssignments.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})