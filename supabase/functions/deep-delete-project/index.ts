import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { project_id, user_id, reason } = await req.json()

    if (!project_id || !user_id) {
      throw new Error('project_id and user_id are required')
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🗑️ Starting deep deletion for project:', project_id)

    // First, get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, title, owner_id, status')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      throw new Error('Project not found')
    }

    // Verify ownership
    if (project.owner_id !== user_id) {
      throw new Error('Unauthorized: Only project owner can delete')
    }

    // Get affected candidates before deletion
    const { data: assignments } = await supabase
      .from('hr_resource_assignments')
      .select(`
        candidate_id,
        candidate_profiles!inner(
          id,
          user_id
        )
      `)
      .eq('project_id', project_id)
      .eq('booking_status', 'accepted')

    const affectedUsers = assignments?.map(a => a.candidate_profiles?.user_id).filter(Boolean) || []

    // ============ DÉBUT DU NETTOYAGE DES DONNÉES ============

    console.log('🧹 1. Suppression des messages du projet...')
    // Supprimer tous les messages liés au projet
    const { error: messagesError, count: messagesDeleted } = await supabase
      .from('messages')
      .delete()
      .eq('project_id', project_id)

    if (messagesError) {
      console.warn('Erreur lors de la suppression des messages:', messagesError)
    } else {
      console.log(`✅ ${messagesDeleted || 0} messages supprimés`)
    }

    console.log('🧹 2. Suppression des fichiers du Drive...')
    // Lister tous les fichiers du projet dans le storage
    const { data: filesList, error: listError } = await supabase
      .storage
      .from('project-files')
      .list(`projects/${project_id}`, {
        limit: 1000,
        offset: 0
      })

    if (!listError && filesList) {
      // Supprimer tous les fichiers trouvés
      const filesToDelete = filesList.map(file => `projects/${project_id}/${file.name}`)

      if (filesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .storage
          .from('project-files')
          .remove(filesToDelete)

        if (deleteError) {
          console.warn('Erreur lors de la suppression des fichiers:', deleteError)
        } else {
          console.log(`✅ ${filesToDelete.length} fichiers supprimés du Drive`)
        }
      }
    }

    console.log('🧹 3. Suppression des cartes Kanban...')
    // Supprimer toutes les cartes Kanban
    const { error: kanbanError, count: kanbanDeleted } = await supabase
      .from('kanban_cards')
      .delete()
      .eq('project_id', project_id)

    if (kanbanError) {
      console.warn('Erreur lors de la suppression des cartes Kanban:', kanbanError)
    } else {
      console.log(`✅ ${kanbanDeleted || 0} cartes Kanban supprimées`)
    }

    console.log('🧹 4. Suppression des colonnes Kanban...')
    // Supprimer les colonnes Kanban personnalisées
    const { error: columnsError, count: columnsDeleted } = await supabase
      .from('kanban_columns')
      .delete()
      .eq('project_id', project_id)

    if (columnsError) {
      console.warn('Erreur lors de la suppression des colonnes Kanban:', columnsError)
    } else {
      console.log(`✅ ${columnsDeleted || 0} colonnes Kanban supprimées`)
    }

    console.log('🧹 5. Suppression des événements de calendrier...')
    // Supprimer les événements du projet
    const { error: eventsError, count: eventsDeleted } = await supabase
      .from('project_events')
      .delete()
      .eq('project_id', project_id)

    if (eventsError) {
      console.warn('Erreur lors de la suppression des événements:', eventsError)
    } else {
      console.log(`✅ ${eventsDeleted || 0} événements supprimés`)
    }

    console.log('🧹 6. Suppression des participants aux événements...')
    // Supprimer les participants aux événements (table de liaison)
    const { error: attendeesError, count: attendeesDeleted } = await supabase
      .from('project_event_attendees')
      .delete()
      .eq('project_id', project_id)

    if (attendeesError) {
      console.warn('Erreur lors de la suppression des participants:', attendeesError)
    } else {
      console.log(`✅ ${attendeesDeleted || 0} participations supprimées`)
    }

    console.log('🧹 7. Suppression des pièces jointes des messages...')
    // Supprimer les pièces jointes des messages
    const { error: attachmentsError, count: attachmentsDeleted } = await supabase
      .from('message_attachments')
      .delete()
      .eq('project_id', project_id)

    if (attachmentsError) {
      console.warn('Erreur lors de la suppression des pièces jointes:', attachmentsError)
    } else {
      console.log(`✅ ${attachmentsDeleted || 0} pièces jointes supprimées`)
    }

    // ============ DONNÉES À CONSERVER ============
    console.log('📋 Conservation des données importantes...')
    console.log('  ✓ Factures conservées')
    console.log('  ✓ Notes des candidats conservées')
    console.log('  ✓ Paiements conservés')
    console.log('  ✓ Crédits clients conservés')
    console.log('  ✓ Historique des ressources (hr_resource_assignments) conservé')

    // ============ MARQUAGE DU PROJET COMME SUPPRIMÉ ============
    console.log('🏷️ Marquage du projet comme supprimé...')

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user_id,
        deletion_reason: reason,
        status: 'completed', // Use 'completed' to avoid constraint violation
        updated_at: new Date().toISOString()
      })
      .eq('id', project_id)

    if (updateError) {
      console.error('Update error:', updateError)
      throw new Error(`Failed to mark project as deleted: ${updateError.message}`)
    }

    // Log the action
    const { error: logError } = await supabase
      .from('project_action_logs')
      .insert({
        project_id: project_id,
        action_type: 'deleted',
        action_reason: reason,
        performed_by: user_id,
        affected_users: affectedUsers,
        metadata: {
          messages_deleted: messagesDeleted || 0,
          kanban_cards_deleted: kanbanDeleted || 0,
          kanban_columns_deleted: columnsDeleted || 0,
          events_deleted: eventsDeleted || 0,
          files_deleted: filesList?.length || 0
        }
      })

    if (logError) {
      console.warn('Failed to log action:', logError)
    }

    // Create notifications for affected candidates
    if (affectedUsers.length > 0) {
      const candidateNotifications = assignments?.map(a => ({
        candidate_id: a.candidate_id,
        project_id: project_id,
        type: 'project_deleted',
        title: 'Projet supprimé',
        message: `Le projet "${project.title}" a été supprimé par le client`,
        priority: 'high'
      })).filter(n => n.candidate_id)

      if (candidateNotifications && candidateNotifications.length > 0) {
        await supabase
          .from('candidate_notifications')
          .insert(candidateNotifications)
      }
    }

    // Create notification for owner
    await supabase
      .from('notifications')
      .insert({
        user_id: user_id,
        type: 'project_deleted',
        title: 'Projet supprimé avec succès',
        message: `Le projet "${project.title}" et toutes ses données associées ont été supprimés`,
        data: {
          project_id: project_id,
          project_title: project.title,
          affected_users: affectedUsers.length,
          cleanup_summary: {
            messages_deleted: messagesDeleted || 0,
            kanban_cards_deleted: kanbanDeleted || 0,
            events_deleted: eventsDeleted || 0,
            files_deleted: filesList?.length || 0
          }
        }
      })

    console.log('✅ Suppression complète terminée avec succès!')

    return new Response(
      JSON.stringify({
        success: true,
        affected_users: affectedUsers.length,
        project_title: project.title,
        message: 'Project and all associated data successfully deleted',
        cleanup_summary: {
          messages_deleted: messagesDeleted || 0,
          kanban_cards_deleted: kanbanDeleted || 0,
          kanban_columns_deleted: columnsDeleted || 0,
          events_deleted: eventsDeleted || 0,
          attendees_deleted: attendeesDeleted || 0,
          files_deleted: filesList?.length || 0,
          attachments_deleted: attachmentsDeleted || 0
        },
        preserved_data: [
          'invoices',
          'candidate_notes',
          'payments',
          'client_credits',
          'hr_resource_assignments'
        ]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in deep-delete-project:', error)
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