import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Récupérer tous les candidats qui n'ont pas de numéro de téléphone
    const { data: candidatesWithoutPhone, error: fetchError } = await supabase
      .from('candidate_profiles')
      .select('id, user_id, phone')
      .is('phone', null)

    if (fetchError) {
      throw fetchError
    }

    console.log(`Found ${candidatesWithoutPhone?.length || 0} candidates without phone`)

    // Pour chaque candidat, récupérer le numéro depuis profiles
    const updates = []
    for (const candidate of candidatesWithoutPhone || []) {
      if (!candidate.user_id) continue

      // Récupérer le numéro depuis profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', candidate.user_id)
        .single()

      if (profileError) {
        console.error(`Error fetching profile for user ${candidate.user_id}:`, profileError)
        continue
      }

      if (profile?.phone) {
        console.log(`Updating candidate ${candidate.id} with phone ${profile.phone}`)
        
        // Mettre à jour le candidat avec le numéro
        const { error: updateError } = await supabase
          .from('candidate_profiles')
          .update({ phone: profile.phone })
          .eq('id', candidate.id)

        if (updateError) {
          console.error(`Error updating candidate ${candidate.id}:`, updateError)
        } else {
          updates.push(candidate.id)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${updates.length} candidate profiles with phone numbers`,
        updatedCandidates: updates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})