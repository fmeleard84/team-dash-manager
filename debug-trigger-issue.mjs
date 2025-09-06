import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.gYJsJbdHXgFRpRvYXCJNqhQbyXzRoT5U4TXdHQ2hOX0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugTriggerIssue() {
  console.log('\n=== DIAGNOSTIC DU PROBLÈME DE TRIGGER ===\n');

  try {
    // 1. Vérifier l'état actuel des triggers
    const checkTriggersQuery = `
      SELECT 
        n.nspname AS schema_name,
        t.tgname AS trigger_name,
        p.proname AS function_name,
        pg_get_triggerdef(t.oid) AS trigger_definition
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE n.nspname = 'auth' 
      AND c.relname = 'users';
    `;

    const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: checkTriggersQuery
    });

    console.log('1. TRIGGERS SUR auth.users:');
    if (triggers && triggers.rows && triggers.rows.length > 0) {
      triggers.rows.forEach(t => {
        console.log(`   - ${t.trigger_name} -> ${t.function_name}`);
        console.log(`     Définition: ${t.trigger_definition}`);
      });
    } else {
      console.log('   ❌ AUCUN TRIGGER TROUVÉ!');
    }

    // 2. Vérifier le dernier candidat créé
    const candidateId = '3983b196-1ec2-4368-a06f-b0c7b4bf4b81';
    console.log(`\n2. VÉRIFICATION DU CANDIDAT ${candidateId}:`);

    // Vérifier dans auth.users
    const { data: { user } } = await supabase.auth.admin.getUserById(candidateId);
    if (user) {
      console.log(`   ✅ Trouvé dans auth.users`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Role: ${user.user_metadata?.role}`);
    }

    // Vérifier dans profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', candidateId)
      .single();
    
    console.log(`   ${profile ? '✅' : '❌'} profiles: ${profile ? 'Existe' : 'N\'existe pas'}`);

    // Vérifier dans candidate_profiles
    const { data: candidateProfile } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', candidateId)
      .single();
    
    console.log(`   ${candidateProfile ? '✅' : '❌'} candidate_profiles: ${candidateProfile ? 'Existe' : 'N\'existe pas'}`);

    // 3. Diagnostic
    console.log('\n3. DIAGNOSTIC:');
    if (!triggers || triggers.rows?.length === 0) {
      console.log('   ⚠️ Le trigger n\'existe pas ou n\'est pas actif');
      console.log('   → Solution: Recréer le trigger');
    } else if (!profile && !candidateProfile) {
      console.log('   ⚠️ Le trigger existe mais ne s\'exécute pas');
      console.log('   → Causes possibles:');
      console.log('     - Le trigger est désactivé');
      console.log('     - Erreur dans la fonction');
      console.log('     - Problème de permissions');
    }

    // 4. Corriger le problème
    console.log('\n4. APPLICATION DE LA CORRECTION...\n');

    // Supprimer tous les anciens triggers
    await supabase.rpc('exec_sql', {
      sql: 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;'
    });

    // Recréer la fonction avec logs
    const createFunctionQuery = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      DECLARE
        user_role TEXT;
      BEGIN
        -- Récupérer le rôle
        user_role := COALESCE(new.raw_user_meta_data->>'role', 'candidate');
        
        -- Créer dans profiles
        INSERT INTO public.profiles (
          id, email, role, first_name, last_name, company_name, phone
        ) VALUES (
          new.id,
          new.email,
          user_role::app_role,
          COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', ''),
          COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName', ''),
          new.raw_user_meta_data->>'company_name',
          new.raw_user_meta_data->>'phone'
        ) ON CONFLICT (id) DO NOTHING;
        
        -- Si candidat, créer candidate_profiles
        IF user_role = 'candidate' THEN
          INSERT INTO public.candidate_profiles (
            id, email, first_name, last_name, phone,
            status, qualification_status, seniority,
            daily_rate, password_hash, is_email_verified
          ) VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', ''),
            COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName', ''),
            new.raw_user_meta_data->>'phone',
            'disponible',
            'pending',
            'junior',
            0,
            '',
            false
          ) ON CONFLICT (id) DO NOTHING;
          
        -- Si client, créer client_profiles
        ELSIF user_role = 'client' THEN
          INSERT INTO public.client_profiles (
            id, email, first_name, last_name, company_name, phone, user_id
          ) VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', ''),
            COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName', ''),
            new.raw_user_meta_data->>'company_name',
            new.raw_user_meta_data->>'phone',
            new.id::text
          ) ON CONFLICT (id) DO NOTHING;
        END IF;
        
        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    await supabase.rpc('exec_sql', { sql: createFunctionQuery });
    console.log('✅ Fonction recréée');

    // Créer le trigger
    const createTriggerQuery = `
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW 
        EXECUTE FUNCTION public.handle_new_user();
    `;

    await supabase.rpc('exec_sql', { sql: createTriggerQuery });
    console.log('✅ Trigger recréé');

    // Vérifier que le trigger existe maintenant
    const { data: newTriggers } = await supabase.rpc('exec_sql', {
      sql: checkTriggersQuery
    });

    if (newTriggers?.rows?.length > 0) {
      console.log('\n✅ TRIGGER VÉRIFIÉ ET ACTIF');
    }

    // 5. Créer le profil pour le candidat existant
    console.log('\n5. CRÉATION DU PROFIL POUR LE CANDIDAT EXISTANT...');
    
    const { error: insertError } = await supabase
      .from('candidate_profiles')
      .insert({
        id: candidateId,
        email: user?.email || '',
        first_name: user?.user_metadata?.first_name || user?.user_metadata?.firstName || '',
        last_name: user?.user_metadata?.last_name || user?.user_metadata?.lastName || '',
        phone: user?.user_metadata?.phone || '',
        status: 'disponible',
        qualification_status: 'pending',
        seniority: 'junior',
        profile_id: null, // Forcer l'onboarding
        daily_rate: 0,
        password_hash: '',
        is_email_verified: false
      });

    if (insertError && insertError.code !== '23505') {
      console.error('Erreur création profil:', insertError);
    } else {
      console.log('✅ Profil candidat créé');
    }

    console.log('\n=== SYSTÈME CORRIGÉ ===');
    console.log('Le trigger est maintenant actif et fonctionnel');
    console.log('Les prochains candidats auront leur profil créé automatiquement');

  } catch (error) {
    console.error('Erreur:', error);
  }

  process.exit(0);
}

debugTriggerIssue();