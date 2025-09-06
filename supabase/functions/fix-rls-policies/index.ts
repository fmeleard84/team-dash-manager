import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    const userId = '51efcad1-d129-4139-ab08-c1529bcc243a'
    
    // First ensure profile exists
    const { data: profile } = await supabaseAdmin
      .from('client_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (!profile) {
      const { error: profileError } = await supabaseAdmin
        .from('client_profiles')
        .insert({
          id: userId,
          email: 'fmeleard+client_5@gmail.com',
          first_name: 'Client',
          last_name: 'Test'
        })
      
      if (profileError) {
        return new Response(
          JSON.stringify({ error: 'Could not create profile', details: profileError }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
    }
    
    // Create project with unique ID
    const projectId = crypto.randomUUID()
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert({
        id: projectId,
        title: 'Projet Test ' + new Date().getTime(),
        description: 'Projet créé par Edge Function',
        owner_id: userId,
        user_id: userId,
        status: 'pause',
        project_date: new Date().toISOString(),
        client_budget: 5000
      })
      .select()
      .single()
    
    if (error) {
      return new Response(
        JSON.stringify({ error: 'Could not create project', details: error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // List all projects
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id, title, owner_id, user_id, status')
      .or(`owner_id.eq.${userId},user_id.eq.${userId}`)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        project,
        totalProjects: projects?.length || 0,
        projects
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
