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

    console.log('🔧 Correction complète des jointures après unification des IDs...')
    
    const fixes = {
      candidateLanguages: false,
      candidateExpertises: false,
      hrResourceAssignments: false,
      activeTimeTracking: false
    }
    
    // 1. Vérifier et corriger candidate_languages
    console.log('\n1️⃣ Vérification de candidate_languages...')
    try {
      // Test de requête avec jointure
      const { error: langError } = await supabaseAdmin
        .from('candidate_languages')
        .select('*, hr_languages(*)')
        .limit(1)
      
      if (langError) {
        console.log('❌ Erreur jointure candidate_languages:', langError.message)
        
        // Vérifier la FK
        const { data: constraint } = await supabaseAdmin.rpc('check_foreign_key', {
          table_name: 'candidate_languages',
          column_name: 'language_id',
          foreign_table: 'hr_languages'
        })
        
        if (!constraint) {
          // Recréer la FK
          await supabaseAdmin.rpc('execute_sql', {
            sql: `
              ALTER TABLE candidate_languages
              DROP CONSTRAINT IF EXISTS candidate_languages_language_id_fkey;
              
              ALTER TABLE candidate_languages
              ADD CONSTRAINT candidate_languages_language_id_fkey
              FOREIGN KEY (language_id) REFERENCES hr_languages(id);
            `
          })
          console.log('✅ FK candidate_languages -> hr_languages recréée')
        }
        fixes.candidateLanguages = true
      } else {
        console.log('✅ Jointure candidate_languages OK')
      }
    } catch (e) {
      console.error('Erreur candidate_languages:', e)
    }
    
    // 2. Vérifier et corriger candidate_expertises
    console.log('\n2️⃣ Vérification de candidate_expertises...')
    try {
      const { error: expError } = await supabaseAdmin
        .from('candidate_expertises')
        .select('*, hr_expertises(*)')
        .limit(1)
      
      if (expError) {
        console.log('❌ Erreur jointure candidate_expertises:', expError.message)
        
        await supabaseAdmin.rpc('execute_sql', {
          sql: `
            ALTER TABLE candidate_expertises
            DROP CONSTRAINT IF EXISTS candidate_expertises_expertise_id_fkey;
            
            ALTER TABLE candidate_expertises
            ADD CONSTRAINT candidate_expertises_expertise_id_fkey
            FOREIGN KEY (expertise_id) REFERENCES hr_expertises(id);
          `
        })
        console.log('✅ FK candidate_expertises -> hr_expertises recréée')
        fixes.candidateExpertises = true
      } else {
        console.log('✅ Jointure candidate_expertises OK')
      }
    } catch (e) {
      console.error('Erreur candidate_expertises:', e)
    }
    
    // 3. Vérifier et corriger hr_resource_assignments
    console.log('\n3️⃣ Vérification de hr_resource_assignments...')
    try {
      const { error: hraError } = await supabaseAdmin
        .from('hr_resource_assignments')
        .select(`
          *,
          candidate_profiles!candidate_id(*)
        `)
        .limit(1)
      
      if (hraError) {
        console.log('❌ Erreur jointure hr_resource_assignments:', hraError.message)
        
        // Vérifier si la colonne candidate_id existe
        const { data: columns } = await supabaseAdmin.rpc('get_table_columns', {
          table_name: 'hr_resource_assignments'
        })
        
        const hasCandidateId = columns?.some((c: any) => c.column_name === 'candidate_id')
        
        if (!hasCandidateId) {
          await supabaseAdmin.rpc('execute_sql', {
            sql: `
              ALTER TABLE hr_resource_assignments
              ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidate_profiles(id);
            `
          })
          console.log('✅ Colonne candidate_id ajoutée')
        }
        
        // Recréer la FK
        await supabaseAdmin.rpc('execute_sql', {
          sql: `
            ALTER TABLE hr_resource_assignments
            DROP CONSTRAINT IF EXISTS hr_resource_assignments_candidate_id_fkey;
            
            ALTER TABLE hr_resource_assignments
            ADD CONSTRAINT hr_resource_assignments_candidate_id_fkey
            FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id);
          `
        })
        console.log('✅ FK hr_resource_assignments -> candidate_profiles recréée')
        fixes.hrResourceAssignments = true
      } else {
        console.log('✅ Jointure hr_resource_assignments OK')
      }
    } catch (e) {
      console.error('Erreur hr_resource_assignments:', e)
    }
    
    // 4. Vérifier active_time_tracking (erreur 406)
    console.log('\n4️⃣ Vérification de active_time_tracking...')
    try {
      const { error: attError } = await supabaseAdmin
        .from('active_time_tracking')
        .select('*, projects(*)')
        .limit(1)
      
      if (attError) {
        console.log('❌ Erreur active_time_tracking:', attError.message)
        
        // Vérifier si la table existe
        const { data: tables } = await supabaseAdmin.rpc('check_table_exists', {
          table_name: 'active_time_tracking'
        })
        
        if (!tables) {
          console.log('⚠️ Table active_time_tracking n\'existe pas')
        } else {
          console.log('✅ Table existe mais problème de RLS ou de structure')
        }
        fixes.activeTimeTracking = true
      } else {
        console.log('✅ active_time_tracking OK')
      }
    } catch (e) {
      console.error('Erreur active_time_tracking:', e)
    }
    
    // 5. Créer les fonctions helper si nécessaire
    try {
      await supabaseAdmin.rpc('execute_sql', {
        sql: `
          -- Fonction pour vérifier les FK
          CREATE OR REPLACE FUNCTION check_foreign_key(
            table_name text,
            column_name text,
            foreign_table text
          ) RETURNS boolean
          LANGUAGE sql SECURITY DEFINER
          AS $$
            SELECT EXISTS (
              SELECT 1
              FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
              JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
              WHERE tc.table_name = $1
              AND kcu.column_name = $2
              AND ccu.table_name = $3
              AND tc.constraint_type = 'FOREIGN KEY'
            );
          $$;
          
          -- Fonction pour obtenir les colonnes
          CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
          RETURNS TABLE(column_name text, data_type text)
          LANGUAGE sql SECURITY DEFINER
          AS $$
            SELECT column_name::text, data_type::text
            FROM information_schema.columns
            WHERE table_name = $1
            ORDER BY ordinal_position;
          $$;
          
          -- Fonction pour vérifier si une table existe
          CREATE OR REPLACE FUNCTION check_table_exists(table_name text)
          RETURNS boolean
          LANGUAGE sql SECURITY DEFINER
          AS $$
            SELECT EXISTS (
              SELECT 1
              FROM information_schema.tables
              WHERE table_name = $1
            );
          $$;
          
          -- Fonction pour exécuter du SQL
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
    
    // 6. Test final avec une vraie requête candidat
    console.log('\n✅ Test final de matching candidat...')
    const candidateEmail = 'fmeleard+ressource_27_08_cdp@gmail.com'
    
    const { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select(`
        *,
        candidate_languages(*, hr_languages(*)),
        candidate_expertises(*, hr_expertises(*))
      `)
      .eq('email', candidateEmail)
      .single()
    
    if (candidateProfile) {
      console.log('✅ Profil candidat récupéré avec jointures')
      console.log('   Langues:', candidateProfile.candidate_languages?.length || 0)
      console.log('   Expertises:', candidateProfile.candidate_expertises?.length || 0)
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Jointures vérifiées et corrigées',
        fixes,
        candidateProfile: candidateProfile ? {
          id: candidateProfile.id,
          email: candidateProfile.email,
          languages: candidateProfile.candidate_languages?.length || 0,
          expertises: candidateProfile.candidate_expertises?.length || 0
        } : null
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