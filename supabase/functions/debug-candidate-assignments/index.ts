import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { candidateEmail } = await req.json();
    const email = candidateEmail || 'fmeleard+ressource_5@gmail.com';

    console.log('🔍 DEBUG: Checking candidate assignments for:', email);
    
    // 1. Find candidate profile
    const { data: candidateProfile, error: profileError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    console.log('Candidate profile:', candidateProfile);
    if (profileError) console.log('Profile error:', profileError);
    
    if (!candidateProfile) {
      return new Response(
        JSON.stringify({ 
          error: 'No candidate profile found',
          email: email,
          profileError
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 2. Check all hr_resource_assignments for this candidate
    const { data: allAssignments, error: assignmentsError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        projects (
          id,
          title,
          status,
          project_date
        )
      `)
      .eq('profile_id', candidateProfile.profile_id)
      .eq('seniority', candidateProfile.seniority);
    
    console.log('All assignments:', allAssignments?.length || 0);
    if (assignmentsError) console.log('Assignments error:', assignmentsError);
    
    // 3. Filter by booking status
    const acceptedAssignments = allAssignments?.filter(a => a.booking_status === 'accepted') || [];
    const rechercheAssignments = allAssignments?.filter(a => a.booking_status === 'recherche') || [];
    const draftAssignments = allAssignments?.filter(a => a.booking_status === 'draft') || [];
    
    console.log('Accepted assignments:', acceptedAssignments.length);
    console.log('Recherche assignments:', rechercheAssignments.length);
    console.log('Draft assignments:', draftAssignments.length);
    
    // 4. Check projects with different statuses
    const projectsByStatus = {
      play: acceptedAssignments.filter(a => a.projects?.status === 'play'),
      'attente-team': acceptedAssignments.filter(a => a.projects?.status === 'attente-team'),
      pause: acceptedAssignments.filter(a => a.projects?.status === 'pause'),
      nouveaux: acceptedAssignments.filter(a => a.projects?.status === 'nouveaux')
    };

    return new Response(
      JSON.stringify({ 
        success: true,
        candidate: {
          id: candidateProfile.id,
          email: candidateProfile.email,
          profile_id: candidateProfile.profile_id,
          seniority: candidateProfile.seniority,
          status: candidateProfile.status
        },
        assignments: {
          total: allAssignments?.length || 0,
          accepted: acceptedAssignments.length,
          recherche: rechercheAssignments.length,
          draft: draftAssignments.length
        },
        projectsByStatus: {
          play: projectsByStatus.play.length,
          'attente-team': projectsByStatus['attente-team'].length,
          pause: projectsByStatus.pause.length,
          nouveaux: projectsByStatus.nouveaux.length
        },
        detailedAssignments: allAssignments?.map(a => ({
          id: a.id,
          booking_status: a.booking_status,
          project_title: a.projects?.title,
          project_status: a.projects?.status,
          project_date: a.projects?.project_date
        }))
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Debug error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})