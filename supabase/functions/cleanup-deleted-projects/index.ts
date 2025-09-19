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

    console.log('🧹 Début du nettoyage des projets supprimés...')

    // Récupérer tous les projets marqués comme supprimés
    const { data: deletedProjects, error: fetchError } = await supabase
      .from('projects')
      .select('id, title, deleted_at, owner_id')
      .not('deleted_at', 'is', null)

    if (fetchError) {
      throw fetchError
    }

    if (!deletedProjects || deletedProjects.length === 0) {
      console.log('✅ Aucun projet supprimé à nettoyer')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Aucun projet supprimé à nettoyer',
          projects_cleaned: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log(`📊 ${deletedProjects.length} projets supprimés trouvés`)

    const cleanupResults = []
    let totalMessagesDeleted = 0
    let totalKanbanDeleted = 0
    let totalFilesDeleted = 0
    let totalEventsDeleted = 0

    for (const project of deletedProjects) {
      console.log(`🗑️ Nettoyage du projet: ${project.title} (${project.id})`)

      try {
        // 1. Supprimer les messages
        const { count: messagesDeleted } = await supabase
          .from('messages')
          .delete()
          .eq('project_id', project.id)

        if (messagesDeleted) totalMessagesDeleted += messagesDeleted

        // 2. Supprimer les fichiers du Drive
        const { data: filesList } = await supabase
          .storage
          .from('project-files')
          .list(`projects/${project.id}`, {
            limit: 1000,
            offset: 0
          })

        if (filesList && filesList.length > 0) {
          const filesToDelete = filesList.map(file => `projects/${project.id}/${file.name}`)
          const { error: deleteError } = await supabase
            .storage
            .from('project-files')
            .remove(filesToDelete)

          if (!deleteError) {
            totalFilesDeleted += filesToDelete.length
          }
        }

        // 3. Supprimer les cartes Kanban
        const { count: kanbanDeleted } = await supabase
          .from('kanban_cards')
          .delete()
          .eq('project_id', project.id)

        if (kanbanDeleted) totalKanbanDeleted += kanbanDeleted

        // 4. Supprimer les colonnes Kanban
        await supabase
          .from('kanban_columns')
          .delete()
          .eq('project_id', project.id)

        // 5. Supprimer les événements
        const { count: eventsDeleted } = await supabase
          .from('project_events')
          .delete()
          .eq('project_id', project.id)

        if (eventsDeleted) totalEventsDeleted += eventsDeleted

        // 6. Supprimer les participants aux événements
        await supabase
          .from('project_event_attendees')
          .delete()
          .eq('project_id', project.id)

        // 7. Supprimer les pièces jointes
        await supabase
          .from('message_attachments')
          .delete()
          .eq('project_id', project.id)

        cleanupResults.push({
          project_id: project.id,
          project_title: project.title,
          status: 'cleaned',
          deleted_at: project.deleted_at
        })

        console.log(`✅ Projet ${project.title} nettoyé`)

      } catch (error) {
        console.error(`❌ Erreur lors du nettoyage du projet ${project.id}:`, error)
        cleanupResults.push({
          project_id: project.id,
          project_title: project.title,
          status: 'error',
          error: error.message
        })
      }
    }

    // Log global du nettoyage
    await supabase
      .from('project_action_logs')
      .insert({
        action_type: 'bulk_cleanup',
        action_reason: 'Nettoyage automatique des projets supprimés',
        performed_by: 'system',
        metadata: {
          projects_cleaned: cleanupResults.filter(r => r.status === 'cleaned').length,
          total_messages_deleted: totalMessagesDeleted,
          total_kanban_deleted: totalKanbanDeleted,
          total_files_deleted: totalFilesDeleted,
          total_events_deleted: totalEventsDeleted,
          projects_list: cleanupResults
        }
      })

    console.log('🎉 Nettoyage terminé avec succès!')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Nettoyage des projets supprimés terminé',
        projects_cleaned: cleanupResults.filter(r => r.status === 'cleaned').length,
        projects_with_errors: cleanupResults.filter(r => r.status === 'error').length,
        summary: {
          total_messages_deleted: totalMessagesDeleted,
          total_kanban_cards_deleted: totalKanbanDeleted,
          total_files_deleted: totalFilesDeleted,
          total_events_deleted: totalEventsDeleted
        },
        details: cleanupResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in cleanup-deleted-projects:', error)
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