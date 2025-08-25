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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔧 Correction status du projet "dir marketing new"')
    
    const projectId = '98007f64-f647-4ed9-b004-7daa1f06b373'
    
    // 1. Vérifier l'état actuel
    const { data: currentProject, error: fetchError } = await supabaseClient
      .from('projects')
      .select('id, title, status, created_at')
      .eq('id', projectId)
      .single()
      
    console.log('📋 État actuel du projet:', currentProject)
    
    if (!currentProject) {
      console.log('❌ Projet non trouvé')
      return new Response(
        JSON.stringify({ error: 'Projet non trouvé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }
    
    // 2. Mettre à jour le status à "play"
    const { data: updatedProject, error: updateError } = await supabaseClient
      .from('projects')
      .update({ status: 'play' })
      .eq('id', projectId)
      .select()
      .single()
      
    if (updateError) {
      console.error('❌ Erreur mise à jour:', updateError)
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    console.log('✅ Projet mis à jour:', updatedProject)
    
    // 3. Vérifier que l'assignment est toujours correct
    const { data: assignments, error: assignmentError } = await supabaseClient
      .from('hr_resource_assignments')
      .select(`
        id,
        profile_id,
        booking_status,
        languages,
        expertises,
        seniority,
        hr_profiles(name)
      `)
      .eq('project_id', projectId)
      
    console.log('📝 Assignments pour ce projet:', assignments)

    return new Response(
      JSON.stringify({
        success: true,
        previousStatus: currentProject.status,
        newStatus: updatedProject.status,
        assignments: assignments,
        message: 'Projet "dir marketing new" activé avec succès'
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