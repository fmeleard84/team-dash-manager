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

    console.log('Attempting to delete project:', project_id)

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

    // Get affected candidates
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

    // Instead of using 'cancelled' status which causes constraint violation,
    // we'll mark it as 'completed' and set the deleted_at timestamp
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user_id,
        deletion_reason: reason,
        status: 'completed', // Use 'completed' instead of 'cancelled' to avoid constraint violation
        updated_at: new Date().toISOString()
      })
      .eq('id', project_id)

    if (updateError) {
      console.error('Update error:', updateError)
      throw new Error(`Failed to delete project: ${updateError.message}`)
    }

    // Log the action
    const { error: logError } = await supabase
      .from('project_action_logs')
      .insert({
        project_id: project_id,
        action_type: 'deleted',
        action_reason: reason,
        performed_by: user_id,
        affected_users: affectedUsers
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
        message: `Le projet "${project.title}" a été supprimé`,
        data: {
          project_id: project_id,
          project_title: project.title,
          affected_users: affectedUsers.length
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        affected_users: affectedUsers.length,
        project_title: project.title,
        message: 'Project successfully deleted'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in fix-project-delete:', error)
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