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
    const { assignment_id, candidate_email } = body

    console.log('=== DEBUG ACCEPT MISSION ===')
    console.log('Assignment ID:', assignment_id)
    console.log('Candidate email:', candidate_email)

    // 1. Check if candidate exists
    const { data: candidate, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('email', candidate_email)
      .single()

    if (candidateError) {
      console.error('Candidate error:', candidateError)
      return new Response(JSON.stringify({ 
        error: 'Candidate not found', 
        details: candidateError,
        candidate_email
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      })
    }

    console.log('Candidate found:', candidate.first_name, candidate.last_name)
    console.log('Candidate ID:', candidate.id)
    console.log('Candidate profile_id:', candidate.profile_id)
    console.log('Candidate seniority:', candidate.seniority)

    // 2. Check assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        projects (
          id,
          title,
          status
        )
      `)
      .eq('id', assignment_id)
      .single()

    if (assignmentError) {
      console.error('Assignment error:', assignmentError)
      return new Response(JSON.stringify({ 
        error: 'Assignment not found', 
        details: assignmentError,
        assignment_id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      })
    }

    console.log('Assignment found:', assignment)
    console.log('Assignment booking_status:', assignment.booking_status)
    console.log('Assignment profile_id:', assignment.profile_id)
    console.log('Assignment seniority:', assignment.seniority)

    // 3. Check if assignment matches candidate
    const profileMatch = assignment.profile_id === candidate.profile_id
    const seniorityMatch = assignment.seniority === candidate.seniority

    console.log('Profile match:', profileMatch, `(${assignment.profile_id} === ${candidate.profile_id})`)
    console.log('Seniority match:', seniorityMatch, `(${assignment.seniority} === ${candidate.seniority})`)

    if (!profileMatch || !seniorityMatch) {
      return new Response(JSON.stringify({ 
        error: 'Candidate does not match assignment requirements',
        profileMatch,
        seniorityMatch,
        assignment: {
          profile_id: assignment.profile_id,
          seniority: assignment.seniority
        },
        candidate: {
          profile_id: candidate.profile_id,
          seniority: candidate.seniority
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // 4. Check if assignment is available
    if (assignment.booking_status !== 'recherche') {
      return new Response(JSON.stringify({ 
        error: 'Assignment is not available',
        current_status: assignment.booking_status,
        expected_status: 'recherche'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // 5. Try to update the assignment
    console.log('Attempting to update assignment to accepted...')
    
    const { data: updateData, error: updateError } = await supabase
      .from('hr_resource_assignments')
      .update({
        booking_status: 'accepted',
        candidate_id: candidate.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignment_id)
      .eq('booking_status', 'recherche') // Atomic check
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(JSON.stringify({ 
        error: 'Failed to update assignment',
        details: updateError,
        attempted_update: {
          booking_status: 'accepted',
          candidate_id: candidate.id
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    console.log('Assignment updated successfully:', updateData)

    // 6. Check project status update
    const { data: allAssignments } = await supabase
      .from('hr_resource_assignments')
      .select('booking_status')
      .eq('project_id', assignment.project_id)

    const acceptedCount = allAssignments?.filter(a => 
      a.booking_status === 'accepted' || a.booking_status === 'booké'
    ).length || 0
    
    const totalCount = allAssignments?.length || 0

    console.log(`Project ${assignment.project_id}: ${acceptedCount}/${totalCount} resources accepted`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mission accepted successfully',
        data: {
          candidate_id: candidate.id,
          assignment_id: assignment_id,
          project_status: `${acceptedCount}/${totalCount} accepted`,
          updated_assignment: updateData
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})