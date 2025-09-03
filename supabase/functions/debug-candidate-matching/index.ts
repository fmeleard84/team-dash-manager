import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.5'

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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json().catch(() => ({}))
    const emailToCheck = body.candidateEmail || 'fmeleard+ressource_27_08_cdp@gmail.com'

    console.log('=== DEBUGGING CANDIDATE MATCHING ===')
    console.log('Candidate email:', emailToCheck)
    
    // 1. Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select(`
        *,
        candidate_languages (
          language_id,
          hr_languages (id, code, name)
        ),
        candidate_expertises (
          expertise_id,
          hr_expertises (id, name)
        )
      `)
      .eq('email', emailToCheck)
      .single()

    if (candidateError) {
      console.error('Error fetching candidate:', candidateError)
      return new Response(JSON.stringify({ error: 'Candidate not found', details: candidateError }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      })
    }

    console.log('Candidate found:', candidateProfile.first_name, candidateProfile.last_name)

    // 2. Get all assignments in 'recherche' status
    const { data: assignments, error: assignmentsError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        projects (
          id,
          title,
          status
        ),
        hr_profiles (
          id,
          name,
          hr_categories (name)
        )
      `)
      .eq('booking_status', 'recherche')
      .order('created_at', { ascending: false })

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError)
      return new Response(JSON.stringify({ error: 'Failed to fetch assignments', details: assignmentsError }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    const results = {
      candidate: {
        id: candidateProfile.id,
        name: `${candidateProfile.first_name} ${candidateProfile.last_name}`,
        email: candidateProfile.email,
        profile_id: candidateProfile.profile_id,
        seniority: candidateProfile.seniority,
        status: candidateProfile.status,
        languages: candidateProfile.candidate_languages?.map(l => l.hr_languages?.name) || [],
        expertises: candidateProfile.candidate_expertises?.map(e => e.hr_expertises?.name) || []
      },
      assignments: {
        total: assignments?.length || 0,
        details: []
      },
      matching: []
    }

    // Check each assignment for matching
    assignments?.forEach((assignment, index) => {
      const assignmentInfo = {
        id: assignment.id,
        project: assignment.projects?.title,
        profile_id: assignment.profile_id,
        profile_name: assignment.hr_profiles?.name,
        required_seniority: assignment.seniority,
        required_languages: assignment.languages || [],
        required_expertises: assignment.expertises || [],
        booking_status: assignment.booking_status
      }

      results.assignments.details.push(assignmentInfo)

      // Check matching criteria
      const profileMatch = assignment.profile_id === candidateProfile.profile_id
      const seniorityMatch = assignment.seniority === candidateProfile.seniority
      
      const candidateLanguageNames = candidateProfile.candidate_languages?.map(l => l.hr_languages?.name) || []
      const requiredLanguages = assignment.languages || []
      const languageMatch = requiredLanguages.length === 0 || requiredLanguages.every(lang => candidateLanguageNames.includes(lang))
      
      const candidateExpertiseNames = candidateProfile.candidate_expertises?.map(e => e.hr_expertises?.name) || []
      const requiredExpertises = assignment.expertises || []
      const expertiseMatch = requiredExpertises.length === 0 || requiredExpertises.every(exp => candidateExpertiseNames.includes(exp))
      
      const overallMatch = profileMatch && seniorityMatch && languageMatch && expertiseMatch

      results.matching.push({
        assignment_id: assignment.id,
        project: assignment.projects?.title,
        profile_match: profileMatch,
        seniority_match: seniorityMatch,
        language_match: languageMatch,
        expertise_match: expertiseMatch,
        overall_match: overallMatch,
        details: {
          profile_check: `${assignment.profile_id} === ${candidateProfile.profile_id}`,
          seniority_check: `${assignment.seniority} === ${candidateProfile.seniority}`,
          language_check: `required: [${requiredLanguages.join(', ')}], has: [${candidateLanguageNames.join(', ')}]`,
          expertise_check: `required: [${requiredExpertises.join(', ')}], has: [${candidateExpertiseNames.join(', ')}]`
        }
      })
    })

    return new Response(
      JSON.stringify(results, null, 2),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})