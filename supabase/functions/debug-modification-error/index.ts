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
    const { assignmentId, changes } = await req.json()
    console.log('🔍 Debug: Received request', { assignmentId, changes })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Test 1: Get assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .eq('id', assignmentId)
      .single()

    console.log('Assignment found:', assignment)
    console.log('Assignment error:', assignmentError)

    if (!assignment) {
      return new Response(
        JSON.stringify({ 
          error: 'Assignment not found',
          assignmentId,
          assignmentError 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Test 2: Find notifications for this assignment
    const { data: notifications, error: notifError } = await supabase
      .from('candidate_notifications')
      .select('*')
      .eq('resource_assignment_id', assignmentId)
      .eq('status', 'accepted')

    console.log('Notifications found:', notifications?.length || 0)
    console.log('Notification error:', notifError)

    // Test 3: Find candidates
    if (notifications && notifications.length > 0) {
      for (const notif of notifications) {
        const { data: candidate, error: candError } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('id', notif.candidate_id)
          .single()

        console.log('Candidate found for notification:', candidate?.email)
        console.log('Candidate error:', candError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        assignment: {
          id: assignment.id,
          booking_status: assignment.booking_status,
          profile_id: assignment.profile_id,
          seniority: assignment.seniority
        },
        notifications: notifications?.length || 0,
        debug: 'Check server logs for details'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Debug error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})