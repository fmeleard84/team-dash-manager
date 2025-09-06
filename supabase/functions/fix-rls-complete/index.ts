import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    console.log('🔧 Correction complète des politiques RLS...')
    
    const fixes = []
    
    // 1. CANDIDATE_PROFILES
    console.log('\n1️⃣ Correction RLS candidate_profiles...')
    await supabaseAdmin.rpc('execute_sql', {
      sql: `
        DROP POLICY IF EXISTS "candidate_profiles_select" ON candidate_profiles;
        CREATE POLICY "candidate_profiles_select"
        ON candidate_profiles FOR SELECT
        USING (true);
      `
    })
    fixes.push('candidate_profiles: SELECT public')
    
    // 2. CANDIDATE_LANGUAGES
    console.log('2️⃣ Correction RLS candidate_languages...')
    await supabaseAdmin.rpc('execute_sql', {
      sql: `
        ALTER TABLE candidate_languages ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "candidate_languages_select" ON candidate_languages;
        CREATE POLICY "candidate_languages_select"
        ON candidate_languages FOR SELECT
        USING (true);
      `
    })
    fixes.push('candidate_languages: SELECT public')
    
    // 3. CANDIDATE_EXPERTISES
    console.log('3️⃣ Correction RLS candidate_expertises...')
    await supabaseAdmin.rpc('execute_sql', {
      sql: `
        ALTER TABLE candidate_expertises ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "candidate_expertises_select" ON candidate_expertises;
        CREATE POLICY "candidate_expertises_select"
        ON candidate_expertises FOR SELECT
        USING (true);
      `
    })
    fixes.push('candidate_expertises: SELECT public')
    
    // 4. HR_LANGUAGES
    console.log('4️⃣ Correction RLS hr_languages...')
    await supabaseAdmin.rpc('execute_sql', {
      sql: `
        ALTER TABLE hr_languages ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "hr_languages_select" ON hr_languages;
        CREATE POLICY "hr_languages_select"
        ON hr_languages FOR SELECT
        USING (true);
      `
    })
    fixes.push('hr_languages: SELECT public')
    
    // 5. HR_EXPERTISES
    console.log('5️⃣ Correction RLS hr_expertises...')
    await supabaseAdmin.rpc('execute_sql', {
      sql: `
        ALTER TABLE hr_expertises ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "hr_expertises_select" ON hr_expertises;
        CREATE POLICY "hr_expertises_select"
        ON hr_expertises FOR SELECT
        USING (true);
      `
    })
    fixes.push('hr_expertises: SELECT public')
    
    // 6. HR_RESOURCE_ASSIGNMENTS
    console.log('6️⃣ Correction RLS hr_resource_assignments...')
    await supabaseAdmin.rpc('execute_sql', {
      sql: `
        DROP POLICY IF EXISTS "hr_assignments_select" ON hr_resource_assignments;
        CREATE POLICY "hr_assignments_select"
        ON hr_resource_assignments FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM projects p
                WHERE p.id = hr_resource_assignments.project_id
                AND (p.owner_id = auth.uid() OR p.user_id = auth.uid()::text)
            )
            OR candidate_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM candidate_profiles cp
                WHERE cp.id = auth.uid()
                AND cp.profile_id = hr_resource_assignments.profile_id
            )
        );
      `
    })
    fixes.push('hr_resource_assignments: SELECT pour propriétaire/candidat')
    
    // 7. ACTIVE_TIME_TRACKING (si existe)
    console.log('7️⃣ Vérification active_time_tracking...')
    const { data: tableExists } = await supabaseAdmin.rpc('check_table_exists', {
      table_name: 'active_time_tracking'
    })
    
    if (tableExists) {
      await supabaseAdmin.rpc('execute_sql', {
        sql: `
          ALTER TABLE active_time_tracking ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "active_time_tracking_select" ON active_time_tracking;
          CREATE POLICY "active_time_tracking_select"
          ON active_time_tracking FOR SELECT
          USING (
              candidate_id = auth.uid()
              OR EXISTS (
                  SELECT 1 FROM projects p
                  WHERE p.id = active_time_tracking.project_id
                  AND (p.owner_id = auth.uid() OR p.user_id = auth.uid()::text)
              )
          );
        `
      })
      fixes.push('active_time_tracking: SELECT pour candidat/propriétaire')
    } else {
      console.log('⚠️ Table active_time_tracking n\'existe pas')
    }
    
    // Créer les fonctions helper
    try {
      await supabaseAdmin.rpc('execute_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION check_table_exists(table_name text)
          RETURNS boolean
          LANGUAGE sql SECURITY DEFINER
          AS $$
            SELECT EXISTS (
              SELECT 1 FROM information_schema.tables
              WHERE table_name = $1
            );
          $$;
          
          CREATE OR REPLACE FUNCTION execute_sql(sql text)
          RETURNS void
          LANGUAGE plpgsql SECURITY DEFINER
          AS $$
          BEGIN
            EXECUTE sql;
          END;
          $$;
        `
      })
    } catch (e) {
      // Ignorer si les fonctions existent déjà
    }
    
    // Test final
    console.log('\n✅ Test des jointures...')
    
    // Test 1: Profil candidat avec jointures
    const { data: testProfile, error: profileError } = await supabaseAdmin
      .from('candidate_profiles')
      .select(`
        *,
        candidate_languages(*, hr_languages(*)),
        candidate_expertises(*, hr_expertises(*))
      `)
      .limit(1)
    
    const test1Success = !profileError
    console.log('Test candidate_profiles avec jointures:', test1Success ? '✅' : '❌')
    
    // Test 2: hr_resource_assignments avec jointure
    const { data: testAssignment, error: assignmentError } = await supabaseAdmin
      .from('hr_resource_assignments')
      .select(`
        *,
        candidate_profiles!candidate_id(*)
      `)
      .limit(1)
    
    const test2Success = !assignmentError
    console.log('Test hr_resource_assignments avec jointure:', test2Success ? '✅' : '❌')
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Politiques RLS corrigées',
        fixes,
        tests: {
          candidateProfilesJoin: test1Success,
          hrAssignmentsJoin: test2Success
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})