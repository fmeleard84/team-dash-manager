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

    console.log('🚀 Création de projets et assignments de test...')

    // UUIDs fixes pour les projets de test
    const projectId1 = 'a1111111-1111-1111-1111-111111111111'
    const projectId2 = 'a2222222-2222-2222-2222-222222222222'
    
    // 1. Créer des projets de test
    const { data: projects, error: projectsError } = await supabaseClient
      .from('projects')
      .upsert([
        {
          id: projectId1,
          title: 'New Project Marketing Digital',
          description: 'Campagne marketing digital pour Google Ads',
          status: 'play',
          project_date: new Date().toISOString(),
          client_budget: 5000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: projectId2,
          title: 'Projet Template eCommerce',
          description: 'Développement site ecommerce avec expertise Google Ads',
          status: 'play',
          project_date: new Date().toISOString(),
          client_budget: 8000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()

    if (projectsError) {
      console.error('❌ Erreur projets:', projectsError)
      return new Response(
        JSON.stringify({ error: 'Failed to create projects', details: projectsError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('✅ Projets créés:', projects?.length)

    // 2. Créer des assignments pour Directeur marketing
    const marketingProfileId = '922efb64-1684-45ec-8aea-436c4dad2f37'
    
    const { data: assignments, error: assignmentsError } = await supabaseClient
      .from('hr_resource_assignments')
      .upsert([
        {
          project_id: projectId1,
          profile_id: marketingProfileId,
          seniority: 'intermediate',
          languages: ['Français'],
          expertises: ['Google Ads'],
          calculated_price: 150.00,
          booking_status: 'recherche',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          project_id: projectId2,
          profile_id: marketingProfileId,
          seniority: 'intermediate',
          languages: ['Français'],
          expertises: ['Google Ads'],
          calculated_price: 150.00,
          booking_status: 'recherche',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()

    if (assignmentsError) {
      console.error('❌ Erreur assignments:', assignmentsError)
      return new Response(
        JSON.stringify({ error: 'Failed to create assignments', details: assignmentsError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('✅ Assignments créés:', assignments?.length)

    return new Response(
      JSON.stringify({
        success: true,
        projectsCreated: projects?.length || 0,
        assignmentsCreated: assignments?.length || 0,
        message: 'Projets et assignments de test créés avec succès',
        projects: projects,
        assignments: assignments
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