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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 Verify Candidate Data for Storage RLS Debug')

    const results: any = {
      success: true,
      timestamp: new Date().toISOString(),
      projectId: 'd7dff6ec-5019-40ab-a00f-8bac8806eca7',
      candidateName: 'CDP FM 2708',
      data: {}
    }

    // 1. Vérifier le candidat
    console.log('👤 Checking candidate...')
    const { data: candidateData, error: candidateError } = await supabaseClient
      .from('candidate_profiles')
      .select('id, first_name, last_name, user_id, email, status, qualification_status')
      .eq('first_name', 'CDP FM 2708')
      .single()

    results.data.candidate = {
      data: candidateData,
      error: candidateError?.message || null
    }

    console.log('👤 Candidate result:', candidateData)

    // 2. Vérifier les assignations
    console.log('📂 Checking assignments...')
    const { data: assignmentData, error: assignmentError } = await supabaseClient
      .from('hr_resource_assignments')
      .select(`
        id,
        project_id,
        booking_status,
        candidate_id,
        candidate_profiles!inner (
          user_id,
          first_name,
          email
        )
      `)
      .eq('project_id', 'd7dff6ec-5019-40ab-a00f-8bac8806eca7')

    results.data.assignments = {
      data: assignmentData,
      error: assignmentError?.message || null
    }

    console.log('📂 Assignments result:', assignmentData)

    // 3. Vérifier le projet
    console.log('🏗️ Checking project...')
    const { data: projectData, error: projectError } = await supabaseClient
      .from('projects')
      .select('id, name, title, owner_id, status')
      .eq('id', 'd7dff6ec-5019-40ab-a00f-8bac8806eca7')
      .single()

    results.data.project = {
      data: projectData,
      error: projectError?.message || null
    }

    console.log('🏗️ Project result:', projectData)

    // 4. Vérifier si on peut obtenir l'auth user du candidat
    if (candidateData?.user_id) {
      console.log('🔑 Checking auth user...')
      try {
        const { data: authUser, error: authError } = await supabaseClient.auth.admin.getUserById(candidateData.user_id)
        
        results.data.authUser = {
          data: authUser ? {
            id: authUser.user?.id,
            email: authUser.user?.email,
            created_at: authUser.user?.created_at
          } : null,
          error: authError?.message || null
        }
        
        console.log('🔑 Auth user result:', authUser?.user?.email)
      } catch (err) {
        results.data.authUser = {
          data: null,
          error: `Failed to get auth user: ${err}`
        }
      }
    }

    // 5. Analyse RLS
    if (candidateData && assignmentData && assignmentData.length > 0) {
      console.log('🔍 RLS Analysis...')
      
      const candidate = candidateData
      const assignment = assignmentData.find(a => a.candidate_profiles?.first_name === 'CDP FM 2708')
      
      const simulatedPath = `projects/${results.projectId}/test-file.pdf`
      const extractedProjectId = simulatedPath.split('/')[1]
      
      results.data.rlsAnalysis = {
        candidateUserId: candidate.user_id,
        bookingStatus: assignment?.booking_status,
        simulatedPath: simulatedPath,
        extractedProjectId: extractedProjectId,
        projectMatch: assignment?.project_id === extractedProjectId,
        bookingAccepted: assignment?.booking_status === 'accepted',
        shouldWork: (
          assignment?.project_id === extractedProjectId &&
          assignment?.booking_status === 'accepted'
        ),
        issues: []
      }

      // Identifier les problèmes potentiels
      const analysis = results.data.rlsAnalysis
      if (!analysis.projectMatch) {
        analysis.issues.push('Project ID mismatch in path parsing')
      }
      if (!analysis.bookingAccepted) {
        analysis.issues.push(`Booking status is "${assignment?.booking_status}" instead of "accepted"`)
      }
      if (!candidate.user_id) {
        analysis.issues.push('Candidate has no user_id')
      }

      console.log('🔍 RLS Analysis:', results.data.rlsAnalysis)
    }

    // 6. Résumé diagnostic
    results.summary = {
      candidateFound: !!candidateData,
      assignmentFound: !!(assignmentData && assignmentData.length > 0),
      projectFound: !!projectData,
      authUserFound: !!(results.data.authUser?.data),
      shouldRLSWork: results.data.rlsAnalysis?.shouldWork || false,
      mainIssues: results.data.rlsAnalysis?.issues || []
    }

    console.log('📊 Summary:', results.summary)

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Fatal error:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      details: error.details || 'No additional details'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})