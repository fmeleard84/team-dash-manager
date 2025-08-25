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

    const { profileData } = await req.json()

    console.log('📝 Mise à jour/création profil pour:', user.id)
    console.log('Données reçues:', profileData)

    // First check if profile exists in profiles table
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          job_title: profileData.job_title || existingProfile.job_title,
          role: profileData.job_title || existingProfile.role,
          seniority: profileData.seniority_level || existingProfile.seniority,
          seniority_level: profileData.seniority_level || existingProfile.seniority_level,
          skills: profileData.technical_skills || existingProfile.skills,
          technical_skills: profileData.technical_skills || existingProfile.technical_skills,
          languages: profileData.languages || existingProfile.languages,
          bio: profileData.bio || existingProfile.bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('Erreur update:', updateError)
        return new Response(JSON.stringify({ error: updateError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }

      return new Response(JSON.stringify({
        success: true,
        action: 'updated',
        profile: updatedProfile
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      // Create new profile
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: profileData.full_name || user.email?.split('@')[0],
          job_title: profileData.job_title,
          role: profileData.job_title,
          seniority: profileData.seniority_level,
          seniority_level: profileData.seniority_level,
          skills: profileData.technical_skills,
          technical_skills: profileData.technical_skills,
          languages: profileData.languages,
          bio: profileData.bio,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) {
        console.error('Erreur insert:', insertError)
        return new Response(JSON.stringify({ error: insertError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }

      return new Response(JSON.stringify({
        success: true,
        action: 'created',
        profile: newProfile
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})