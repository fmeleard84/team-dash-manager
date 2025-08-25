import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const ELEVENLABS_API_KEY = 'sk_78684f6ed063bb3803838d5ce932e5c38d0a308e542381ac';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { agentId } = await req.json();
    
    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    console.log('Getting signed URL for agent:', agentId);

    // Get signed URL from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get signed URL: ${error}`);
    }

    const data = await response.json();
    
    // Add custom variables to the signed URL response
    const enrichedData = {
      ...data,
      custom_llm_data: {
        user_name: 'Candidat',
        agent_name: 'Assistant IA',
        greeting: 'Bonjour ! Je suis votre assistant pour le test de compétences.'
      }
    };

    return new Response(
      JSON.stringify(enrichedData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});