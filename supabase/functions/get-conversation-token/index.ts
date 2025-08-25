import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY') || 'sk_78684f6ed063bb3803838d5ce932e5c38d0a308e542381ac';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { agentId, userId } = await req.json();
    
    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    // Créer une URL signée pour la conversation
    // Pour un agent privé, nous devons utiliser l'API de signature
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_id: agentId
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs API error:', error);
      
      // Si l'erreur est 404, essayer l'ancienne méthode
      if (response.status === 404) {
        console.log('Trying alternative method...');
        
        // Méthode alternative : obtenir un token de conversation
        const tokenResponse = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': ELEVENLABS_API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
          }
        );
        
        if (!tokenResponse.ok) {
          const tokenError = await tokenResponse.text();
          console.error('Token API error:', tokenError);
          throw new Error(`Failed to create conversation: ${tokenResponse.status}`);
        }
        
        const tokenData = await tokenResponse.json();
        console.log('Conversation created:', tokenData);
        
        return new Response(
          JSON.stringify({ 
            token: tokenData.signed_url || tokenData.url || tokenData.conversation_url,
            conversationId: tokenData.conversation_id 
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
      
      throw new Error(`Failed to get signed URL: ${response.status}`);
    }

    const data = await response.json();
    console.log('Signed URL response:', data);
    
    return new Response(
      JSON.stringify({ 
        token: data.signed_url || data.url,
        conversationId: data.conversation_id 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error getting conversation token:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});