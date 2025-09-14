import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json()
    const { messages, tools, model = 'gpt-4o', temperature = 0.7, max_tokens = 2000, stream = false } = requestBody

    console.log('Request received with stream:', stream)

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtenir la clé OpenAI depuis les variables d'environnement
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Si streaming est activé
    if (stream) {
      console.log('Starting streaming response...')
      
      // Créer un TransformStream pour SSE
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model,
                messages,
                tools,
                temperature,
                max_tokens,
                tool_choice: tools ? 'auto' : undefined,
                stream: true
              }),
            })

            if (!openaiResponse.ok) {
              const error = await openaiResponse.text()
              console.error('OpenAI API error:', error)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Failed to get response from OpenAI' })}\n\n`))
              controller.close()
              return
            }

            const reader = openaiResponse.body?.getReader()
            if (!reader) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'No response body' })}\n\n`))
              controller.close()
              return
            }

            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                  } else if (data.trim()) {
                    try {
                      const parsed = JSON.parse(data)
                      const delta = parsed.choices?.[0]?.delta
                      
                      // Envoyer le delta au client
                      if (delta) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          type: 'delta',
                          content: delta.content || '',
                          tool_calls: delta.tool_calls,
                          finish_reason: parsed.choices?.[0]?.finish_reason
                        })}\n\n`))
                      }
                    } catch (e) {
                      console.error('Error parsing stream data:', e)
                    }
                  }
                }
              }
            }

            controller.close()
          } catch (error) {
            console.error('Streaming error:', error)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`))
            controller.close()
          }
        }
      })

      // Retourner la réponse SSE
      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Mode non-streaming (existant)
    console.log('Using non-streaming mode')
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        tools,
        temperature,
        max_tokens,
        tool_choice: tools ? 'auto' : undefined
      }),
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text()
      console.error('OpenAI API error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to get response from OpenAI', details: error }),
        { status: openaiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await openaiResponse.json()
    const choice = data.choices[0]

    // Formater la réponse
    const response = {
      content: choice.message.content,
      tool_calls: choice.message.tool_calls,
      finish_reason: choice.finish_reason
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in chat-completion function:', error)
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})