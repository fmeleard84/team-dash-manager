import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [], projectId } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch HR data from Supabase
    const [categoriesRes, profilesRes, languagesRes, expertisesRes] = await Promise.all([
      supabase.from('hr_categories').select('*'),
      supabase.from('hr_profiles').select('*'),
      supabase.from('hr_languages').select('*'),
      supabase.from('hr_expertises').select('*')
    ]);

    const categories = categoriesRes.data || [];
    const profiles = profilesRes.data || [];
    const languages = languagesRes.data || [];
    const expertises = expertisesRes.data || [];

    // Build dynamic system message with real data
    const profilesText = profiles.map(p => {
      const category = categories.find(c => c.id === p.category_id);
      return `- ${p.name} (ID: "${p.id}") - ${p.base_price}€/h - Catégorie: ${category?.name || 'N/A'}`;
    }).join('\n');

    const languagesText = languages.map(l => 
      `${l.name} (+${l.cost_percentage}%)`
    ).join(', ');

    const expertisesText = expertises.map(e => 
      `${e.name} (+${e.cost_percentage}%)`
    ).join(', ');

    // Prepare conversation messages
    const messages = [
      {
        role: 'system',
        content: `Tu es un assistant IA spécialisé dans la création d'équipes de projets avec des ressources humaines.

Ton rôle est de :
1. Analyser le projet décrit par l'utilisateur
2. Proposer une équipe adaptée en JUSTIFIANT VOS CHOIX de séniorité
3. Expliquer pourquoi chaque niveau de séniorité est approprié pour chaque rôle

PROFILS HR DISPONIBLES :
${profilesText}

NIVEAUX DE SÉNIORITÉ :
- junior : pour des tâches standards, bien définies, avec supervision
- intermediate : pour des tâches complexes nécessitant de l'autonomie  
- senior : pour des tâches critiques, leadership, architecture, expertise pointue

LANGUES DISPONIBLES (bonus) :
${languagesText}

EXPERTISES DISPONIBLES (bonus) :
${expertisesText}

INSTRUCTIONS IMPORTANTES :
1. NE JAMAIS mentionner les prix dans votre réponse textuelle
2. TOUJOURS justifier vos choix de séniorité avec des arguments pertinents
3. Expliquer comment l'équipe va fonctionner ensemble
4. Utiliser UNIQUEMENT les profils disponibles dans la base de données

Exemple de justification :
"Pour ce projet e-commerce, j'ai choisi :
- Un chef de projet SENIOR car la coordination de multiples équipes et la gestion des délais serrés nécessitent une forte expérience
- Un développeur JUNIOR pour l'intégration frontend car les technologies sont standards et bien documentées
- Un designer INTERMEDIATE pour l'UX car l'interface utilisateur est critique pour les conversions"

Pour générer une équipe, inclure un JSON à la fin de votre réponse :
{
  "type": "graph_generation",
  "nodes": [
    {
      "id": "node-1",
      "profile_id": "[ID du profil depuis la base]",
      "seniority": "junior|intermediate|senior",
      "languages": ["[IDs des langues]"],
      "expertises": ["[IDs des expertises]"]
    }
  ],
  "edges": [
    { "id": "edge-1", "source": "node-1", "target": "node-2" }
  ]
}

Répondez en français et justifiez chaque choix de séniorité.`
      },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Try to parse if it's a graph generation response
    let parsedGraph = null;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        if (parsed.type === 'graph_generation') {
          // Transform AI nodes to proper ReactFlow nodes with HRResource data
          const transformedNodes = parsed.nodes.map((node: any, index: number) => {
            const profile = profiles.find(p => p.id === node.profile_id);
            
            return {
              id: `node-${Date.now()}-${index}`,
              type: 'hrResource',
              position: { 
                x: 200 + (index % 3) * 250, 
                y: 100 + Math.floor(index / 3) * 200 
              },
              data: {
                hrResource: {
                  id: `resource-${Date.now()}-${index}`,
                  profileId: node.profile_id,
                  profile: profile,
                  seniority: node.seniority || 'junior',
                  languages: node.languages || [],
                  expertises: node.expertises || [],
                  calculatedPrice: profile?.base_price || 50
                }
              }
            }
          });

          parsedGraph = {
            type: 'graph_generation',
            nodes: transformedNodes,
            edges: parsed.edges || []
          };
        }
      }
    } catch (e) {
      console.error('Error parsing graph JSON:', e);
    }

    return new Response(JSON.stringify({
      message: aiResponse,
      graph: parsedGraph
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-graph-generator:', error);
    return new Response(JSON.stringify({ 
      error: 'Erreur lors de la génération',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});