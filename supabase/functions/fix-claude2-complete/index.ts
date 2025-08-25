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
    
    // Use service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const claudeProjectId = 'a2505a79-1198-44ae-83fb-141c7168afbf'
    const candidateId = '3f1b71ad-a7e1-48ea-ba76-c1d412da9929'
    
    const results = []
    
    // 1. Update project status to 'play'
    results.push('📊 1. Mise à jour du statut projet...')
    const { error: statusError } = await supabase
      .from('projects')
      .update({ status: 'play' })
      .eq('id', claudeProjectId)
    
    if (statusError) {
      results.push(`❌ Erreur statut: ${statusError.message}`)
    } else {
      results.push('✅ Statut mis à jour vers "play"')
    }
    
    // 2. Check for existing Kanban board
    results.push('\n📋 2. Vérification Kanban existant...')
    const { data: existingBoards, error: checkError } = await supabase
      .from('kanban_boards')
      .select('*')
      .eq('project_id', claudeProjectId)
    
    if (checkError) {
      results.push(`❌ Erreur vérification: ${checkError.message}`)
    } else if (existingBoards && existingBoards.length > 0) {
      results.push(`✅ Tableau existant trouvé: ${existingBoards[0].title}`)
      
      // Update members if needed
      const board = existingBoards[0]
      if (!board.members?.includes(candidateId)) {
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
      }
    } else {
      // 3. Create new Kanban board
      results.push('\n➕ 3. Création nouveau tableau Kanban...')
      
      const { data: newBoard, error: boardError } = await supabase
        .from('kanban_boards')
        .insert({
          title: 'Kanban - Claude 2',
          project_id: claudeProjectId,
          members: [candidateId]
        })
        .select()
        .single()
      
      if (boardError) {
        results.push(`❌ Erreur création tableau: ${boardError.message}`)
      } else {
        results.push(`✅ Tableau créé avec ID: ${newBoard.id}`)
        
        // 4. Create columns
        results.push('\n📝 4. Création des colonnes...')
        const columns = [
          { board_id: newBoard.id, title: 'Setup', position: 0, color: '#3b82f6' },
          { board_id: newBoard.id, title: 'A faire', position: 1, color: '#6b7280' },
          { board_id: newBoard.id, title: 'En cours', position: 2, color: '#f59e0b' },
          { board_id: newBoard.id, title: 'A vérifier', position: 3, color: '#f97316' },
          { board_id: newBoard.id, title: 'Finalisé', position: 4, color: '#10b981' }
        ]
        
        const { error: columnsError } = await supabase
          .from('kanban_columns')
          .insert(columns)
        
        if (columnsError) {
          results.push(`❌ Erreur création colonnes: ${columnsError.message}`)
        } else {
          results.push('✅ Toutes les colonnes créées')
        }
      }
    }
    
    // 5. Final verification
    results.push('\n📊 5. Vérification finale...')
    const { data: finalProject, error: finalProjectError } = await supabase
      .from('projects')
      .select('status')
      .eq('id', claudeProjectId)
      .single()
    
    const { data: finalBoard, error: finalBoardError } = await supabase
      .from('kanban_boards')
      .select('id, title, members')
      .eq('project_id', claudeProjectId)
      .single()
    
    if (!finalProjectError && finalProject) {
      results.push(`✅ Statut projet: ${finalProject.status}`)
    }
    
    if (!finalBoardError && finalBoard) {
      results.push(`✅ Tableau Kanban: ${finalBoard.title}`)
      results.push(`✅ Candidat dans membres: ${finalBoard.members?.includes(candidateId) ? 'OUI' : 'NON'}`)
    }
    
    results.push('\n🎉 Corrections terminées avec succès!')
    
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