import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Supprimer TOUS les projets existants (environnement de développement)
    const { data: deletedProjects, error: deleteError } = await supabase
      .from('projects')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Supprimer tout
      .select()

    if (deleteError) {
      throw deleteError
    }

    console.log(`Supprimé ${deletedProjects?.length || 0} projets`)

    // Supprimer aussi les ressources orphelines
    const { data: deletedResources } = await supabase
      .from('hr_resources')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select()

    console.log(`Supprimé ${deletedResources?.length || 0} ressources`)

    // Supprimer les assignations orphelines
    const { data: deletedAssignments } = await supabase
      .from('hr_resource_assignments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select()

    console.log(`Supprimé ${deletedAssignments?.length || 0} assignations`)

    return new Response(
      JSON.stringify({
        success: true,
        deleted: {
          projects: deletedProjects?.length || 0,
          resources: deletedResources?.length || 0,
          assignments: deletedAssignments?.length || 0
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})