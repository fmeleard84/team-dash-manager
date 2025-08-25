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

    console.log('🧹 Nettoyage des projets de test par nom')
    
    // Projets de test à nettoyer
    const testProjectTitles = ['Mon projet perso', 'Test 2', 'test6', 'test 6']
    const results = []
    
    for (const title of testProjectTitles) {
      console.log(`\n📁 Traitement du projet: "${title}"`)
      
      // Récupérer les assignments de ce projet
      const { data: assignments, error: fetchError } = await supabaseClient
        .from('hr_resource_assignments')
        .select(`
          *,
          projects!inner(title)
        `)
        .eq('projects.title', title)
        .eq('booking_status', 'recherche')
        .is('candidate_id', null)
      
      if (fetchError) {
        console.error(`  ❌ Erreur: ${fetchError.message}`)
        results.push({ title, status: 'error', message: fetchError.message })
        continue
      }
      
      if (!assignments || assignments.length === 0) {
        console.log(`  ℹ️ Aucun assignment en recherche trouvé`)
        results.push({ title, status: 'skipped', message: 'Aucun assignment en recherche' })
        continue
      }
      
      console.log(`  📊 ${assignments.length} assignment(s) trouvé(s)`)
      
      // Passer en draft pour les cacher
      const { error: updateError } = await supabaseClient
        .from('hr_resource_assignments')
        .update({ booking_status: 'draft' })
        .in('id', assignments.map(a => a.id))
      
      if (updateError) {
        console.error(`  ❌ Erreur mise à jour: ${updateError.message}`)
        results.push({ title, status: 'error', message: updateError.message })
      } else {
        console.log(`  ✅ Assignments passés en statut "draft" (cachés)`)
        results.push({ title, status: 'success', assignmentsUpdated: assignments.length })
      }
    }

    console.log('\n=====================================')
    console.log('✅ NETTOYAGE TERMINÉ')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Nettoyage des projets de test terminé',
        results
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