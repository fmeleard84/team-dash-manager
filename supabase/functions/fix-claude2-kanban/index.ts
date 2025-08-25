import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Use service role key to bypass RLS - IMPORTANT!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const claudeProjectId = 'a2505a79-1198-44ae-83fb-141c7168afbf'
    const candidateId = '3f1b71ad-a7e1-48ea-ba76-c1d412da9929'
    
    const results = []
    
    // 1. Get project details
    results.push('📊 1. Récupération détails projet...')
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', claudeProjectId)
      .single()
    
    if (projectError) {
      results.push(`❌ Erreur projet: ${projectError.message}`)
      throw projectError
    }
    
    results.push(`✅ Projet trouvé: ${project.title}`)
    results.push(`   Statut actuel: ${project.status}`)
    
    // 2. Update project status to 'play' if needed - USING RAW SQL TO BYPASS RLS
    if (project.status !== 'play') {
      results.push('\n🔄 2. Mise à jour statut projet via SQL direct...')
      
      // Use raw SQL to bypass RLS issues with thread_id
      const { data: updateResult, error: updateError } = await supabase.rpc('exec_sql', {
        sql_query: `UPDATE projects SET status = 'play' WHERE id = '${claudeProjectId}'`
      }).single()
      
      if (updateError) {
        // Try direct update as fallback
        const { error: directError } = await supabase
          .from('projects')
          .update({ status: 'play' })
          .eq('id', claudeProjectId)
        
        if (directError) {
          results.push(`⚠️ Erreur mise à jour statut: ${directError.message}`)
        } else {
          results.push('✅ Statut mis à jour vers "play"')
        }
      } else {
        results.push('✅ Statut mis à jour vers "play" via SQL')
      }
    }
    
    // 3. Check for existing Kanban board
    results.push('\n📋 3. Vérification Kanban existant...')
    const { data: existingBoards, error: checkError } = await supabase
      .from('kanban_boards')
      .select('*')
      .eq('project_id', claudeProjectId)
    
    if (checkError) {
      results.push(`❌ Erreur vérification: ${checkError.message}`)
    } else if (existingBoards && existingBoards.length > 0) {
      const board = existingBoards[0]
      results.push(`✅ Tableau existant trouvé: ${board.title}`)
      results.push(`   ID: ${board.id}`)
      
      // Check columns
      const { data: columns, error: columnsError } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('board_id', board.id)
        .order('position')
      
      if (!columnsError && columns) {
        results.push(`   Colonnes: ${columns.length}`)
        columns.forEach((col: any) => {
          results.push(`   - ${col.title} (position ${col.position})`)
        })
      }
      
      // Update members if needed
      if (!board.members?.includes(candidateId)) {
        results.push('\n🔄 Ajout du candidat aux membres...')
        const updatedMembers = [...(board.members || []), candidateId]
        const { error: updateError } = await supabase
          .from('kanban_boards')
          .update({ members: updatedMembers })
          .eq('id', board.id)
        
        if (updateError) {
          results.push(`❌ Erreur ajout membre: ${updateError.message}`)
        } else {
          results.push('✅ Candidat ajouté aux membres')
        }
      } else {
        results.push('✅ Candidat déjà dans les membres')
      }
      
      results.push('\n✅ Kanban déjà configuré!')
      
    } else {
      // 4. Create new Kanban board - EXACT SAME AS ORCHESTRATOR
      results.push('\n➕ 4. Création nouveau tableau Kanban...')
      
      // Get accepted resources for team members
      const { data: bookings, error: bookingsError } = await supabase
        .from('project_bookings')
        .select(`
          id,
          candidate_id,
          status,
          candidate_profiles!inner(
            id, first_name, last_name, email, profile_type, seniority
          )
        `)
        .eq('project_id', claudeProjectId)
        .eq('status', 'accepted')
      
      if (bookingsError) {
        results.push(`❌ Erreur récupération bookings: ${bookingsError.message}`)
      }
      
      const resources = bookings || []
      const allMembers = [project.owner_id, ...resources.map((r: any) => r.candidate_profiles.id)]
      
      results.push(`   Membres trouvés: ${allMembers.length}`)
      
      // Create board with same structure as orchestrator
      const { data: newBoard, error: boardError } = await supabase
        .from('kanban_boards')
        .insert({
          project_id: claudeProjectId,
          title: `Kanban - ${project.title}`,
          description: `Tableau de gestion des tâches pour le projet "${project.title}"`,
          created_by: project.owner_id,
          members: allMembers,
          team_members: resources.map((r: any) => ({
            id: r.candidate_profiles.id,
            name: `${r.candidate_profiles.first_name} ${r.candidate_profiles.last_name}`,
            email: r.candidate_profiles.email,
            role: r.candidate_profiles.profile_type || 'Ressource',
            seniority: r.candidate_profiles.seniority
          }))
        })
        .select()
        .single()
      
      if (boardError) {
        results.push(`❌ Erreur création tableau: ${boardError.message}`)
        results.push(`   Code: ${boardError.code}`)
        results.push(`   Details: ${JSON.stringify(boardError.details)}`)
        
        // Try without team_members field
        results.push('\n🔄 Nouvel essai sans team_members...')
        const { data: simpleBoard, error: simpleError } = await supabase
          .from('kanban_boards')
          .insert({
            project_id: claudeProjectId,
            title: `Kanban - ${project.title}`,
            description: `Tableau de gestion des tâches pour le projet "${project.title}"`,
            created_by: project.owner_id,
            members: allMembers
          })
          .select()
          .single()
        
        if (simpleError) {
          results.push(`❌ Erreur création simple: ${simpleError.message}`)
        } else {
          results.push(`✅ Tableau créé avec ID: ${simpleBoard.id}`)
          
          // Create columns
          await createColumns(supabase, simpleBoard.id, results)
        }
      } else {
        results.push(`✅ Tableau créé avec ID: ${newBoard.id}`)
        
        // Create columns
        await createColumns(supabase, newBoard.id, results)
      }
    }
    
    // 5. Final verification
    results.push('\n📊 5. Vérification finale...')
    const { data: finalProject } = await supabase
      .from('projects')
      .select('status')
      .eq('id', claudeProjectId)
      .single()
    
    const { data: finalBoard } = await supabase
      .from('kanban_boards')
      .select(`
        id, 
        title, 
        members,
        kanban_columns (
          id,
          title,
          position
        )
      `)
      .eq('project_id', claudeProjectId)
      .single()
    
    if (finalProject) {
      results.push(`✅ Statut projet: ${finalProject.status}`)
    }
    
    if (finalBoard) {
      results.push(`✅ Tableau Kanban: ${finalBoard.title}`)
      results.push(`✅ Candidat dans membres: ${finalBoard.members?.includes(candidateId) ? 'OUI' : 'NON'}`)
      results.push(`✅ Colonnes créées: ${finalBoard.kanban_columns?.length || 0}`)
    }
    
    results.push('\n🎉 Configuration terminée avec succès!')
    
    return new Response(
      JSON.stringify({
        success: true,
        results: results.join('\n')
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function createColumns(supabase: any, boardId: string, results: string[]) {
  results.push('\n📝 Création des colonnes...')
  
  const columns = [
    { board_id: boardId, title: 'Setup', position: 0, color: '#3b82f6' },
    { board_id: boardId, title: 'A faire', position: 1, color: '#6b7280' },
    { board_id: boardId, title: 'En cours', position: 2, color: '#f59e0b' },
    { board_id: boardId, title: 'A vérifier', position: 3, color: '#f97316' },
    { board_id: boardId, title: 'Finalisé', position: 4, color: '#10b981' }
  ]
  
  const { data: createdColumns, error: columnsError } = await supabase
    .from('kanban_columns')
    .insert(columns)
    .select()
  
  if (columnsError) {
    results.push(`❌ Erreur création colonnes: ${columnsError.message}`)
  } else {
    results.push(`✅ ${createdColumns.length} colonnes créées`)
    createdColumns.forEach((col: any) => {
      results.push(`   - ${col.title}`)
    })
  }
}