import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('📊 Checking all projects status...')

    // Get all projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, title, status, archived_at, deleted_at, owner_id, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Categorize projects
    const active = projects?.filter(p => !p.archived_at && !p.deleted_at) || []
    const archived = projects?.filter(p => p.archived_at && !p.deleted_at) || []
    const deleted = projects?.filter(p => p.deleted_at) || []

    // Look for WordPress project
    const wordpress = projects?.find(p =>
      p.title.includes('WordPress') ||
      p.title.includes('Gestion Site Web')
    )

    console.log(`Total projects: ${projects?.length || 0}`)
    console.log(`Active: ${active.length}`)
    console.log(`Archived: ${archived.length}`)
    console.log(`Deleted: ${deleted.length}`)

    if (wordpress) {
      console.log('WordPress project found:', {
        id: wordpress.id,
        title: wordpress.title,
        status: wordpress.status,
        archived: !!wordpress.archived_at,
        deleted: !!wordpress.deleted_at
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: projects?.length || 0,
          active: active.length,
          archived: archived.length,
          deleted: deleted.length
        },
        projects: {
          active: active.map(p => ({
            id: p.id,
            title: p.title,
            status: p.status
          })),
          archived: archived.map(p => ({
            id: p.id,
            title: p.title,
            archived_at: p.archived_at
          })),
          deleted: deleted.map(p => ({
            id: p.id,
            title: p.title,
            deleted_at: p.deleted_at,
            also_archived: !!p.archived_at
          }))
        },
        wordpress_project: wordpress ? {
          id: wordpress.id,
          title: wordpress.title,
          status: wordpress.status,
          archived_at: wordpress.archived_at,
          deleted_at: wordpress.deleted_at
        } : null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error:', error)
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