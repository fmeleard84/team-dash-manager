import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔍 Vérification des prompts dans prompts_ia...')

    // 1. Vérifier s'il y a des prompts
    const { data: prompts, error: promptsError } = await supabase
      .from('prompts_ia')
      .select('*')
      .order('priority', { ascending: false })
    
    if (promptsError) {
      console.error('❌ Erreur récupération prompts:', promptsError)
      throw promptsError
    }

    console.log(`✅ ${prompts?.length || 0} prompts trouvés`)

    // 2. Si pas de prompts, en créer
    if (!prompts || prompts.length === 0) {
      console.log('📝 Création des prompts par défaut...')
      
      const defaultPrompts = [
        {
          name: 'Assistant Général',
          context: 'general',
          prompt: `Tu es l'assistant vocal intelligent de Team Dash Manager, une plateforme de gestion de projets avec matching de ressources humaines.

RÔLE PRINCIPAL :
- Aider les clients à composer des équipes pour leurs projets
- Identifier les besoins en ressources humaines selon le projet
- Proposer les profils adaptés depuis notre base de métiers
- Créer les équipes via les outils disponibles

PROCESSUS :
1. Comprendre le besoin du client (type de projet, durée, budget)
2. Identifier les métiers nécessaires
3. Proposer une équipe avec les bonnes expertises
4. Créer l'équipe si le client est d'accord

IMPORTANT :
- Ne pas donner d'instructions techniques ou tutoriels
- Se concentrer sur la composition d'équipes
- Utiliser UNIQUEMENT les métiers disponibles dans la base
- Toujours proposer une équipe adaptée au projet`,
          active: true,
          priority: 100
        },
        {
          name: 'Composition d\'équipe',
          context: 'team-composition',
          prompt: `Pour composer une équipe, suis ce processus :

1. ANALYSE DU BESOIN :
   - Type de projet (site web, app mobile, marketing, etc.)
   - Durée estimée
   - Budget disponible (optionnel mais utile)
   - Technologies ou compétences spécifiques

2. IDENTIFICATION DES MÉTIERS :
   - Consulte les métiers disponibles dans la base
   - Vérifie les expertises associées à chaque métier
   - Sélectionne les profils pertinents

3. PROPOSITION D'ÉQUIPE :
   - Présente les métiers sélectionnés
   - Explique le rôle de chaque membre
   - Précise les séniorités recommandées
   - Indique les expertises clés

4. CRÉATION :
   - Si le client valide, utilise create_team
   - Passe les bons paramètres (métiers, séniorités, expertises)`,
          active: true,
          priority: 90
        },
        {
          name: 'Comportement Assistant',
          context: 'behavior',
          prompt: `COMPORTEMENT :
- Sois concis et direct
- Pose des questions pour clarifier les besoins
- Propose toujours une solution concrète
- Guide le client vers la création d'équipe
- Utilise les outils disponibles pour créer les équipes`,
          active: true,
          priority: 80
        }
      ]

      const { error: insertError } = await supabase
        .from('prompts_ia')
        .insert(defaultPrompts)
      
      if (insertError) {
        console.error('❌ Erreur insertion prompts:', insertError)
        throw insertError
      }
      
      console.log('✅ Prompts par défaut créés')
    } else {
      // 3. Activer les prompts s'ils sont inactifs
      const inactivePrompts = prompts.filter(p => !p.active)
      if (inactivePrompts.length > 0) {
        console.log(`🔄 Activation de ${inactivePrompts.length} prompts inactifs...`)
        
        const { error: updateError } = await supabase
          .from('prompts_ia')
          .update({ active: true })
          .in('id', inactivePrompts.map(p => p.id))
        
        if (updateError) {
          console.error('❌ Erreur activation prompts:', updateError)
        } else {
          console.log('✅ Prompts activés')
        }
      }
    }

    // 4. Vérifier les policies RLS
    console.log('🔍 Vérification des policies RLS...')
    const { data: policies } = await supabase.rpc('check_rls_policies', {
      table_name: 'prompts_ia'
    }).single()

    return new Response(
      JSON.stringify({
        success: true,
        prompts_count: prompts?.length || 0,
        prompts: prompts,
        policies: policies
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})