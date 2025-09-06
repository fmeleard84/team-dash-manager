import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request
    const { projectId, userId } = await req.json()
    
    console.log('🔍 Debug 400 error for project:', projectId)
    console.log('   User ID:', userId)
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // 1. Test sans RLS (admin)
    console.log('\n1️⃣ Test ADMIN (sans RLS):')
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('hr_resource_assignments')
      .select(`
        id,
        profile_id,
        booking_status,
        candidate_id,
        candidate_profiles!candidate_id (
          first_name,
          last_name
        )
      `)
      .eq('project_id', projectId)
      .limit(1)
    
    if (adminError) {
      console.log('❌ Erreur admin:', adminError)
    } else {
      console.log('✅ Admin OK, données:', adminData?.length || 0, 'résultats')
    }

    // 2. Test avec RLS (simuler utilisateur)
    if (userId) {
      console.log('\n2️⃣ Test avec RLS (user simulé):')
      
      // Créer un client avec l'utilisateur
      const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          auth: { persistSession: false },
          global: {
            headers: {
              'x-user-id': userId // Simuler l'utilisateur
            }
          }
        }
      )
      
      const { data: userData, error: userError } = await supabaseUser
        .from('hr_resource_assignments')
        .select(`
          id,
          profile_id,
          booking_status,
          candidate_id,
          candidate_profiles!candidate_id (
            first_name,
            last_name
          )
        `)
        .eq('project_id', projectId)
        .limit(1)
      
      if (userError) {
        console.log('❌ Erreur user:', userError)
      } else {
        console.log('✅ User OK, données:', userData?.length || 0, 'résultats')
      }
    }

    // 3. Vérifier les politiques RLS
    console.log('\n3️⃣ Vérification RLS:')
    
    const { data: policies } = await supabaseAdmin.rpc('get_policies_info', {})
    console.log('Politiques sur hr_resource_assignments:', 
      policies?.filter((p: any) => p.tablename === 'hr_resource_assignments'))
    console.log('Politiques sur candidate_profiles:', 
      policies?.filter((p: any) => p.tablename === 'candidate_profiles'))

    // 4. Vérifier le propriétaire du projet
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, owner_id, user_id')
      .eq('id', projectId)
      .single()
    
    console.log('\n4️⃣ Projet info:', project)
    console.log(`   User ${userId} est propriétaire: ${project?.owner_id === userId}`)

    // 5. Test sans jointure
    console.log('\n5️⃣ Test sans jointure:')
    const { data: noJoin, error: noJoinError } = await supabaseAdmin
      .from('hr_resource_assignments')
      .select('*')
      .eq('project_id', projectId)
    
    console.log(`   ${noJoin?.length || 0} ressources trouvées`)
    if (noJoin && noJoin.length > 0) {
      console.log('   Exemple:', {
        id: noJoin[0].id,
        booking_status: noJoin[0].booking_status,
        candidate_id: noJoin[0].candidate_id
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        adminWorks: !adminError,
        adminDataCount: adminData?.length || 0,
        projectOwner: project?.owner_id,
        isOwner: project?.owner_id === userId,
        resourcesCount: noJoin?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Helper function
async function createHelperFunction(supabase: any) {
  try {
    await supabase.rpc('execute_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION get_policies_info()
        RETURNS json
        LANGUAGE sql
        SECURITY DEFINER
        AS $$
          SELECT json_agg(row_to_json(p))
          FROM pg_policies p
          WHERE tablename IN ('hr_resource_assignments', 'candidate_profiles', 'projects');
        $$;
      `
    })
  } catch (e) {
    // Ignore if exists
  }
}