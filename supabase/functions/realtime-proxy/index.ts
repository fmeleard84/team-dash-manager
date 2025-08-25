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

  // Upgrade to WebSocket
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket upgrade", { 
      status: 426,
      headers: corsHeaders 
    });
  }

  try {
    // Create WebSocket connection to OpenAI
    const openaiWs = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
      [],
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      }
    );

    // Upgrade the client connection
    const { socket: clientWs, response } = Deno.upgradeWebSocket(req);

    // Proxy messages from client to OpenAI
    clientWs.onmessage = (event) => {
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.send(event.data);
      }
    };

    // Proxy messages from OpenAI to client
    openaiWs.onmessage = (event) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(event.data);
      }
    };

    // Handle OpenAI connection open
    openaiWs.onopen = () => {
      console.log('Connected to OpenAI Realtime API');
    };

    // Handle errors
    openaiWs.onerror = (error) => {
      console.error('OpenAI WebSocket error:', error);
      clientWs.close(1011, 'OpenAI connection error');
    };

    clientWs.onerror = (error) => {
      console.error('Client WebSocket error:', error);
      openaiWs.close();
    };

    // Handle connection close
    openaiWs.onclose = () => {
      console.log('OpenAI connection closed');
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close();
      }
    };

    clientWs.onclose = () => {
      console.log('Client connection closed');
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.close();
      }
    };

    return response;
    
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