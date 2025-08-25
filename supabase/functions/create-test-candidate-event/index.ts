import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Creating test candidate with event...');
    
    // 1. Check/create profile
    const email = 'fmeleard+ressource_2@gmail.com';
    
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (!profile) {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: 'Test123!@#',
        email_confirm: true
      });
      
      if (authError) throw authError;
      
      // Create profile
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          email: email,
          first_name: 'Resource',
          last_name: 'Test',
          user_type: 'candidate'
        })
        .select()
        .single();
      
      if (profileError) throw profileError;
      profile = newProfile;
    } else {
      // Update to candidate type
      await supabase
        .from('profiles')
        .update({ user_type: 'candidate' })
        .eq('id', profile.id);
    }
    
    // 2. Create/update candidate profile
    const { data: candidateProfile } = await supabase
      .from('candidate_profiles')
      .upsert({
        profile_id: profile.id,
        email: email,
        seniority: 'junior',
        status: 'disponible',
        skills: ['JavaScript', 'React', 'Node.js'],
        hourly_rate: 50
      })
      .select()
      .single();
    
    // 3. Find active project
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (!projects || projects.length === 0) {
      throw new Error('No projects found');
    }
    
    const project = projects[0];
    
    // 4. Create assignment
    const { data: assignment } = await supabase
      .from('hr_resource_assignments')
      .upsert({
        project_id: project.id,
        profile_id: profile.id,
        candidate_id: candidateProfile.id,
        seniority: 'junior',
        booking_status: 'accepted',
        booking_data: {
          accepted_at: new Date().toISOString(),
          accepted_by: candidateProfile.id
        }
      })
      .select()
      .single();
    
    // 5. Create kickoff event for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const { data: event } = await supabase
      .from('project_events')
      .insert({
        project_id: project.id,
        title: `Kickoff - ${project.title}`,
        description: 'Réunion de lancement du projet',
        start_at: tomorrow.toISOString(),
        end_at: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(),
        location: 'Visioconférence',
        video_url: `https://meet.jit.si/${project.id}-kickoff`,
        created_by: project.owner_id
      })
      .select()
      .single();
    
    // 6. Add as attendee
    await supabase
      .from('project_event_attendees')
      .insert({
        event_id: event.id,
        email: email,
        required: true,
        response_status: 'pending'
      });
    
    return new Response(
      JSON.stringify({
        success: true,
        profile_id: profile.id,
        candidate_id: candidateProfile.id,
        project_id: project.id,
        project_title: project.title,
        event_id: event.id,
        event_date: tomorrow.toISOString(),
        message: 'Test candidate created with kickoff event'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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