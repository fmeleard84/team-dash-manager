import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, data } = await req.json()
    
    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Vérifier que l'utilisateur est admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Non autorisé')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Non autorisé')
    }

    // Vérifier le rôle admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      throw new Error('Accès refusé - Admin uniquement')
    }

    switch (action) {
      case 'list': {
        // Récupérer tous les prompts
        const { data: prompts, error } = await supabase
          .from('prompts_ia')
          .select('*')
          .order('context', { ascending: true })
          .order('priority', { ascending: false })

        if (error) throw error
        
        return new Response(
          JSON.stringify({ success: true, prompts }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update': {
        // Mettre à jour un prompt
        const { id, ...updates } = data
        
        const { error } = await supabase
          .from('prompts_ia')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
            updated_by: user.id
          })
          .eq('id', id)

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true, message: 'Prompt mis à jour' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'create': {
        // Créer un nouveau prompt
        const { error } = await supabase
          .from('prompts_ia')
          .insert({
            ...data,
            created_by: user.id,
            updated_by: user.id
          })

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true, message: 'Prompt créé' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete': {
        // Supprimer un prompt
        const { id } = data
        
        const { error } = await supabase
          .from('prompts_ia')
          .delete()
          .eq('id', id)

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true, message: 'Prompt supprimé' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'reset': {
        // Réinitialiser aux prompts par défaut
        const { error: deleteError } = await supabase
          .from('prompts_ia')
          .delete()
          .neq('id', 'never_match') // Delete all

        if (deleteError) throw deleteError

        // Réinsérer les prompts par défaut
        const defaultPrompts = [
          {
            id: 'general',
            name: 'Assistant Général',
            context: 'general',
            prompt: `Tu es l'assistant vocal intelligent de Team Dash Manager...`,
            active: true,
            priority: 0
          },
          {
            id: 'team-composition',
            name: 'Composition d\'Équipe',
            context: 'team-composition',
            prompt: `CONTEXTE SPÉCIFIQUE : Composition d'équipe dans ReactFlow...`,
            active: true,
            priority: 1
          },
          // Ajouter les autres prompts par défaut...
        ]

        const { error: insertError } = await supabase
          .from('prompts_ia')
          .insert(defaultPrompts.map(p => ({
            ...p,
            created_by: user.id,
            updated_by: user.id
          })))

        if (insertError) throw insertError

        return new Response(
          JSON.stringify({ success: true, message: 'Prompts réinitialisés' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error(`Action inconnue: ${action}`)
    }
  } catch (error) {
    console.error('Erreur dans manage-prompts-ia:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})