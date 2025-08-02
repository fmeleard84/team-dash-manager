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
    const { message, conversationHistory = [] } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Prepare conversation messages
    const messages = [
      {
        role: 'system',
        content: `Tu es un assistant IA spécialisé dans la création de graphes de projets avec des ressources humaines.

Ton rôle est de :
1. Comprendre les demandes de projets
2. Poser 1-2 questions de clarification si nécessaire  
3. Générer un graphe ReactFlow avec les bonnes ressources HR

Profils HR disponibles :
- Chef de projet junior (id: "1") - 60€/h
- Chef de projet senior (id: "2") - 120€/h
- Designer UI/UX (id: "3") - 80€/h  
- Développeur junior (id: "4") - 50€/h
- Développeur full-stack (id: "5") - 100€/h
- Expert comptable (id: "6") - 90€/h
- Assistant comptable (id: "7") - 45€/h
- Marketing digital (id: "8") - 70€/h

Niveaux séniorité: junior (x1), intermediate (x1.5), senior (x2)

Langues (bonus %): Anglais +10%, Espagnol +8%, Allemand +12%
Expertises (bonus %): WordPress +15%, E-commerce +20%, SEO +10%, Comptabilité fiscale +25%

Pour générer un graphe, réponds avec un JSON:
{
  "type": "graph_generation", 
  "nodes": [...],
  "edges": [...]
}

Exemples:
- Site WordPress → Chef projet junior + Designer + Dev junior (WordPress +15%)
- E-commerce → Chef projet senior + Designer + Dev full-stack (E-commerce +20%)
- Comptabilité → Expert comptable + Assistant (Compta fiscale +25%)`
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
          parsedGraph = parsed;
        }
      }
    } catch (e) {
      // Not a JSON response, that's fine
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