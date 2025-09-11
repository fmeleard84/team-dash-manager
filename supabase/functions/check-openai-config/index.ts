import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Vérifier si la clé OpenAI est configurée
    const openAIKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openAIKey) {
      return new Response(
        JSON.stringify({
          success: false,
          configured: false,
          message: 'Clé OpenAI non configurée dans les secrets Supabase'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Tester la clé avec un appel simple à OpenAI
    try {
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${openAIKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!testResponse.ok) {
        return new Response(
          JSON.stringify({
            success: false,
            configured: true,
            valid: false,
            message: 'Clé OpenAI configurée mais invalide'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          configured: true,
          valid: true,
          message: 'Clé OpenAI configurée et valide',
          key_preview: `${openAIKey.substring(0, 7)}...${openAIKey.substring(openAIKey.length - 4)}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          configured: true,
          valid: false,
          message: 'Erreur lors du test de la clé OpenAI',
          error: error.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})