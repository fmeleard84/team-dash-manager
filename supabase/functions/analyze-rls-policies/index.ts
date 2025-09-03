// Edge function to analyze RLS policies on storage.objects
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Analyzing RLS policies on storage.objects...')

    // Direct SQL query to get policies
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
            policyname,
            cmd as operation,
            permissive,
            roles::text[] as target_roles,
            qual as using_expression,
            with_check as check_expression
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        ORDER BY policyname;
      `
    })

    // Also check if RLS is enabled
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
            tablename,
            rowsecurity as rls_enabled
        FROM pg_tables 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects';
      `
    })

    // Get sample candidate assignments for testing
    const { data: candidateTest, error: candidateError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
            cp.user_id,
            cp.first_name || ' ' || cp.last_name as candidat,
            hra.project_id,
            p.title as projet,
            hra.booking_status,
            'projects/' || hra.project_id::text || '/' as dossier_projet
        FROM hr_resource_assignments hra
        JOIN candidate_profiles cp ON cp.id = hra.candidate_id
        JOIN projects p ON p.id = hra.project_id
        WHERE hra.booking_status = 'accepted'
        AND cp.user_id IS NOT NULL
        LIMIT 5;
      `
    })

    const result = {
      message: 'RLS Policies Analysis for storage.objects',
      timestamp: new Date().toISOString(),
      policies: {
        data: policies || [],
        error: policiesError
      },
      rlsEnabled: {
        data: rlsStatus || [],
        error: rlsError
      },
      candidateAccess: {
        data: candidateTest || [],
        error: candidateError
      },
      analysis: {
        policyCount: policies?.length || 0,
        hasUploadPolicy: policies?.some(p => p.operation === 'INSERT') || false,
        hasViewPolicy: policies?.some(p => p.operation === 'SELECT') || false,
        hasUpdatePolicy: policies?.some(p => p.operation === 'UPDATE') || false,
        hasDeletePolicy: policies?.some(p => p.operation === 'DELETE') || false
      }
    }

    return new Response(
      JSON.stringify(result, null, 2),
      { 
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Function execution failed',
        details: error.message 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})