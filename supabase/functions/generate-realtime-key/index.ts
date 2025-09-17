import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Requesting ephemeral key from OpenAI...');

    // Generate ephemeral key from OpenAI - using the NEW endpoint from documentation
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-realtime',
        voice: 'echo'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`Failed to generate ephemeral key: ${error}`);
    }

    const data = await response.json();
    console.log('OpenAI response received:', Object.keys(data));

    // Extract the ephemeral key from the response
    // The response should contain a client_secret field
    const ephemeralKey = data.client_secret?.value || data.client_secret || data.value;

    if (!ephemeralKey) {
      console.error('OpenAI full response:', JSON.stringify(data));
      throw new Error('No ephemeral key received from OpenAI');
    }

    console.log('Ephemeral key generated successfully');

    return new Response(
      JSON.stringify({
        ephemeralKey,
        expiresIn: 60 // 1 minute (OpenAI Realtime keys are short-lived)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error generating ephemeral key:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});