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
1. Comprendre les demandes de projets
2. Poser 1-2 questions de clarification si nécessaire  
3. Générer un graphe d'équipe avec les bonnes ressources HR

PROFILS HR DISPONIBLES :
${profilesText}

NIVEAUX DE SÉNIORITÉ :
- junior (multiplicateur x1)
- intermediate (multiplicateur x1.5) 
- senior (multiplicateur x2)

LANGUES DISPONIBLES (bonus) :
${languagesText}

EXPERTISES DISPONIBLES (bonus) :
${expertisesText}

IMPORTANT : Pour générer une équipe, tu DOIS répondre avec un JSON au format suivant :
{
  "type": "graph_generation",
  "nodes": [
    {
      "id": "node-1",
      "type": "hrResource", 
      "position": { "x": 200, "y": 100 },
      "data": {
        "id": "resource-1",
        "profileId": "[ID du profil depuis la base]",
        "profileName": "[Nom du profil]",
        "seniority": "junior|intermediate|senior",
        "languages": ["[IDs des langues]"],
        "expertises": ["[IDs des expertises]"],
        "calculatedPrice": [prix calculé avec formule],
        "languageNames": ["[Noms des langues]"],
        "expertiseNames": ["[Noms des expertises]"]
      }
    }
  ],
  "edges": [
    { "id": "edge-1", "source": "node-1", "target": "node-2" }
  ]
}

FORMULE DE CALCUL DU PRIX :
Prix final = (prix_base × multiplicateur_séniorité) × (1 + somme_bonus_langues/100 + somme_bonus_expertises/100)

Exemples d'équipes :
- Site WordPress → Chef projet + Designer + Développeur (avec expertise WordPress)
- E-commerce → Chef projet senior + Designer + Développeur full-stack (avec expertise E-commerce)
- Comptabilité → Expert comptable + Assistant (avec expertise Comptabilité fiscale)`
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
          const transformedNodes = parsed.nodes.map((node: any, index: number) => ({
            id: node.id || `node-${Date.now()}-${index}`,
            type: 'hrResource',
            position: node.position || { 
              x: 200 + (index % 3) * 250, 
              y: 100 + Math.floor(index / 3) * 200 
            },
            data: {
              id: node.data?.id || `resource-${Date.now()}-${index}`,
              profileId: node.data?.profileId || '',
              profileName: node.data?.profileName || 'Profil inconnu',
              seniority: node.data?.seniority || 'junior',
              languages: node.data?.languages || [],
              expertises: node.data?.expertises || [],
              calculatedPrice: node.data?.calculatedPrice || 50,
              languageNames: node.data?.languageNames || [],
              expertiseNames: node.data?.expertiseNames || []
            }
          }));

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