import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No auth header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get the user from the auth header
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'User not found', details: userError }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    console.log('🔍 Recherche profil pour user:', user.id, user.email)
    
    // Check profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (profile && !profileError) {
      console.log('✅ Profil trouvé dans profiles:', profile)
      return new Response(JSON.stringify({
        source: 'profiles',
        profile,
        user: {
          id: user.id,
          email: user.email
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Check candidate_profiles
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (candidateProfile && !candidateError) {
      console.log('✅ Profil trouvé dans candidate_profiles:', candidateProfile)
      return new Response(JSON.stringify({
        source: 'candidate_profiles',
        profile: candidateProfile,
        user: {
          id: user.id,
          email: user.email
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Check hr_profiles
    const { data: hrProfile, error: hrError } = await supabase
      .from('hr_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (hrProfile && !hrError) {
      console.log('✅ Profil trouvé dans hr_profiles:', hrProfile)
      return new Response(JSON.stringify({
        source: 'hr_profiles',
        profile: hrProfile,
        user: {
          id: user.id,
          email: user.email
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // No profile found - try to create one
    console.log('❌ Aucun profil trouvé, vérification des métadonnées utilisateur...')
    
    // Check user metadata for profile info
    const metadata = user.user_metadata || {}
    const appMetadata = user.app_metadata || {}
    
    return new Response(JSON.stringify({
      error: 'No profile found',
      user: {
        id: user.id,
        email: user.email,
        metadata,
        appMetadata
      },
      searched: ['profiles', 'candidate_profiles', 'hr_profiles']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404,
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})