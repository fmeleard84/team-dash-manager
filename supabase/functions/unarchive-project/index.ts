import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { project_id } = await req.json()

    if (!project_id) {
      throw new Error('project_id is required')
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔄 Désarchivage du projet:', project_id)

    // First check if project exists and is archived
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('id, title, archived_at')
      .eq('id', project_id)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!project.archived_at) {
      throw new Error('Le projet n\'est pas archivé')
    }

    // Unarchive the project
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        archived_at: null,
        status: 'pause' // Reset to pause status
      })
      .eq('id', project_id)

    if (updateError) {
      throw updateError
    }

    console.log('✅ Projet désarchivé avec succès')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Projet désarchivé avec succès',
        project: {
          id: project.id,
          title: project.title
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error unarchiving project:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})