import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { projectId } = await req.json()
    console.log('Checking IA resources for project:', projectId)

    // 1. Récupérer tous les profils IA
    const { data: iaProfiles, error: iaError } = await supabase
      .from('hr_profiles')
      .select('id, name, is_ai')
      .eq('is_ai', true)

    console.log('IA Profiles found:', iaProfiles)

    // 2. Récupérer les ressources du projet
    const { data: projectResources, error: resourceError } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .eq('project_id', projectId)

    console.log('Project resources:', projectResources)

    // 3. Analyser les node_data
    const analysis = projectResources?.map(r => ({
      id: r.id,
      profile_id: r.profile_id,
      booking_status: r.booking_status,
      node_data_is_ai: r.node_data?.is_ai,
      node_data_full: r.node_data,
      is_ia_profile: iaProfiles?.some(p => p.id === r.profile_id)
    }))

    return new Response(
      JSON.stringify({
        iaProfiles,
        projectResources: analysis,
        summary: {
          totalResources: projectResources?.length || 0,
          iaResources: analysis?.filter(r => r.node_data_is_ai === true).length || 0,
          iaProfilesCount: iaProfiles?.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})