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

    console.log('🔍 Vérification assignments pour Directeur marketing')
    const marketingProfileId = '922efb64-1684-45ec-8aea-436c4dad2f37'
    
    // 1. Tous les assignments pour directeur marketing
    const { data: assignments, error: assignmentsError } = await supabaseClient
      .from('hr_resource_assignments')
      .select(`
        id,
        project_id,
        profile_id,
        booking_status,
        languages,
        expertises,
        seniority,
        created_at,
        projects(id, title, status),
        hr_profiles(name)
      `)
      .eq('profile_id', marketingProfileId)
      
    console.log('📋 Assignments trouvés:', assignments?.length || 0)
    
    if (assignments) {
      assignments.forEach(a => {
        console.log(`Assignment: ${a.projects?.title} | Status: ${a.booking_status} | Project Status: ${a.projects?.status}`)
      })
    }
    
    // 2. Vérifier les projets de test spécifiquement
    const testProjectIds = ['a1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222']
    
    const { data: testAssignments } = await supabaseClient
      .from('hr_resource_assignments')
      .select(`
        id,
        project_id,
        booking_status,
        languages,
        expertises,
        projects(title, status)
      `)
      .in('project_id', testProjectIds)
      
    console.log('🎯 Test assignments:', testAssignments?.length || 0)
    
    // 3. Créer les assignments manquants pour les projets de test
    const missingAssignments = []
    
    for (const projectId of testProjectIds) {
      const exists = assignments?.find(a => a.project_id === projectId)
      if (!exists) {
        missingAssignments.push({
          project_id: projectId,
          profile_id: marketingProfileId,
          seniority: 'intermediate',
          languages: ['Français'],
          expertises: ['Google Ads'],
          calculated_price: 150.00,
          booking_status: 'recherche'
        })
      }
    }
    
    let createdAssignments = []
    if (missingAssignments.length > 0) {
      console.log('🔧 Création assignments manquants:', missingAssignments.length)
      
      const { data: newAssignments, error: createError } = await supabaseClient
        .from('hr_resource_assignments')
        .insert(missingAssignments)
        .select()
        
      if (createError) {
        console.error('❌ Erreur création:', createError)
      } else {
        createdAssignments = newAssignments || []
        console.log('✅ Assignments créés:', createdAssignments.length)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        existingAssignments: assignments?.length || 0,
        testAssignments: testAssignments?.length || 0,
        createdAssignments: createdAssignments.length,
        assignments: assignments || [],
        newAssignments: createdAssignments,
        message: 'Vérification terminée'
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