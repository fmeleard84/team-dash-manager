import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, sessionConfig } = await req.json();

    if (action === 'get_ephemeral_key') {
      // Générer une clé éphémère pour le client
      // Cette API n'existe pas encore chez OpenAI, donc on utilise la clé directe pour l'instant
      // En production, il faudrait implémenter un proxy WebSocket sécurisé
      
      return new Response(
        JSON.stringify({ 
          success: true,
          client_secret: {
            value: OPENAI_API_KEY,
            expires_at: Math.floor(Date.now() / 1000) + 60 // Expire dans 60 secondes
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'transcribe') {
      // Transcription directe avec Whisper si nécessaire
      const { audio } = await req.json();
      
      const formData = new FormData();
      const audioBlob = new Blob(
        [Uint8Array.from(atob(audio), c => c.charCodeAt(0))],
        { type: 'audio/webm' }
      );
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'fr');
      
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: formData
      });
      
      const result = await response.json();
      
      return new Response(
        JSON.stringify({ 
          success: true,
          text: result.text
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Action non reconnue' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});