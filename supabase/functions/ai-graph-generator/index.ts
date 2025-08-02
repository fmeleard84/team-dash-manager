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

    // Fetch HR data from Supabase with inputs/outputs
    const [categoriesRes, profilesRes, languagesRes, expertisesRes] = await Promise.all([
      supabase.from('hr_categories').select('*'),
      supabase.from('hr_profiles').select('*, inputs, outputs'),
      supabase.from('hr_languages').select('*'),
      supabase.from('hr_expertises').select('*')
    ]);

    const categories = categoriesRes.data || [];
    const profiles = profilesRes.data || [];
    const languages = languagesRes.data || [];
    const expertises = expertisesRes.data || [];

    // Build dynamic system message with real data including inputs/outputs
    const profilesText = profiles.map(p => {
      const category = categories.find(c => c.id === p.category_id);
      const inputs = p.inputs && p.inputs.length > 0 ? p.inputs.join(', ') : 'Non défini';
      const outputs = p.outputs && p.outputs.length > 0 ? p.outputs.join(', ') : 'Non défini';
      return `- ${p.name} (ID: "${p.id}") - Catégorie: ${category?.name || 'N/A'} - Inputs: [${inputs}] - Outputs: [${outputs}]`;
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
        content: `Tu es un assistant IA spécialisé dans la création d'équipes de projets avec des ressources humaines connectées logiquement.

Ton rôle est de :
1. Analyser le projet décrit par l'utilisateur
2. Proposer une équipe adaptée en JUSTIFIANT VOS CHOIX de séniorité
3. Expliquer pourquoi chaque niveau de séniorité est approprié pour chaque rôle
4. Créer des CONNEXIONS LOGIQUES entre les membres de l'équipe

PROFILS HR DISPONIBLES avec inputs/outputs :
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
3. Expliquer comment l'équipe va fonctionner ensemble et qui collabore avec qui
4. Créer des CONNEXIONS (edges) basées sur les inputs/outputs des profils
5. Utiliser UNIQUEMENT les profils disponibles dans la base de données
6. UTILISER LES IDs UUID pour les langues et expertises, JAMAIS les noms

RÈGLE POUR LES CONNEXIONS :
- Si les outputs d'un profil correspondent aux inputs d'un autre, créez une connexion
- Exemple: Chef de projet (outputs: Planning, Spécifications) → Développeur (inputs: Spécifications techniques)
- Chaque équipe DOIT avoir des connexions logiques, pas juste des nodes isolés

Exemple de justification :
"Pour ce projet e-commerce, j'ai choisi :
- Un chef de projet SENIOR car la coordination de multiples équipes et la gestion des délais serrés nécessitent une forte expérience
- Un développeur JUNIOR pour l'intégration frontend car les technologies sont standards et bien documentées  
- Un designer INTERMEDIATE pour l'UX car l'interface utilisateur est critique pour les conversions

L'équipe fonctionne ainsi : Le chef de projet fournit les spécifications au développeur et valide les livrables du designer."

Pour générer une équipe, inclure un JSON à la fin de votre réponse (CE JSON NE SERA PAS VISIBLE À L'UTILISATEUR) :
{
  "type": "graph_generation",
  "nodes": [
    {
      "id": "node-1",
      "profile_id": "[ID UUID du profil depuis la base]",
      "seniority": "junior|intermediate|senior",
      "languages": ["f70e571c-1e59-469e-92c6-cb385486c301"],
      "expertises": ["d6015fa8-dddb-41cf-9d02-cfa16b89ae27"]
    }
  ],
  "edges": [
    { "id": "edge-1", "source": "node-1", "target": "node-2" }
  ]
}

CRITICAL: 
- UTILISEZ UNIQUEMENT des IDs UUID pour languages et expertises
- Exemples d'IDs valides de langues: "f70e571c-1e59-469e-92c6-cb385486c301" (Anglais), "07179458-cd7b-4ed2-bcb0-d2027ee7c544" (Français)
- Exemples d'IDs valides d'expertises: "d6015fa8-dddb-41cf-9d02-cfa16b89ae27" (PHP), "7d0f5118-2b7b-4cba-b60d-34b2ced7c087" (JavaScript)
- NE JAMAIS utiliser "Anglais", "PHP" etc. - SEULEMENT les UUIDs

Répondez en français et justifiez chaque choix de séniorité et chaque connexion.`
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
    let cleanMessage = aiResponse;
    
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        if (parsed.type === 'graph_generation') {
          // Remove JSON from visible message
          cleanMessage = aiResponse.replace(/\{[\s\S]*\}/, '').trim();
          
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

          // Transform edges with proper IDs
          const transformedEdges = (parsed.edges || []).map((edge: any, index: number) => {
            const sourceIndex = parsed.nodes.findIndex((n: any) => n.id === edge.source);
            const targetIndex = parsed.nodes.findIndex((n: any) => n.id === edge.target);
            
            return {
              id: `edge-${Date.now()}-${index}`,
              source: `node-${Date.now()}-${sourceIndex}`,
              target: `node-${Date.now()}-${targetIndex}`,
              type: 'default'
            };
          });

          parsedGraph = {
            type: 'graph_generation',
            nodes: transformedNodes,
            edges: transformedEdges
          };
        }
      }
    } catch (e) {
      console.error('Error parsing graph JSON:', e);
    }

    return new Response(JSON.stringify({
      message: cleanMessage,
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