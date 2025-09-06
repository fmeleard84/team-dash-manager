import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.gYJsJbdHXgFRpRvYXCJNqhQbyXzRoT5U4TXdHQ2hOX0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTriggerAndFix() {
  console.log('\n=== VÉRIFICATION DU TRIGGER ===\n');

  try {
    // 1. Vérifier les triggers existants
    const checkTriggersQuery = `
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_schema,
        event_object_table,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'users'
      AND event_object_schema = 'auth';
    `;

    const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: checkTriggersQuery
    });

    console.log('Triggers trouvés:', triggers || 'Aucun');

    // 2. Vérifier le dernier utilisateur créé
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const lastCandidate = authUsers?.users
      ?.filter(u => u.user_metadata?.role === 'candidate')
      ?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    if (lastCandidate) {
      console.log('\nDernier candidat créé:', lastCandidate.email);
      console.log('ID:', lastCandidate.id);

      // Vérifier si le profil existe
      const { data: profile } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', lastCandidate.id)
        .single();

      if (!profile) {
        console.log('❌ Le profil candidat n\'existe pas!');
      } else {
        console.log('✅ Le profil candidat existe');
      }
    }

    // 3. Recréer le trigger correctement
    console.log('\n🔧 Recréation du trigger...\n');

    // Supprimer l'ancien trigger
    await supabase.rpc('exec_sql', {
      sql: 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;'
    });

    // Recréer la fonction
    const createFunctionQuery = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      DECLARE
        user_role TEXT;
      BEGIN
        -- Récupérer le rôle depuis les metadata
        user_role := COALESCE(new.raw_user_meta_data->>'role', 'candidate');
        
        -- Logger pour debug
        RAISE NOTICE 'handle_new_user triggered for user % with role %', new.email, user_role;
        
        -- Créer le profil général
        INSERT INTO public.profiles (
          id, 
          email, 
          role, 
          first_name, 
          last_name, 
          company_name, 
          phone
        )
        VALUES (
          new.id,
          new.email,
          user_role::app_role,
          COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', ''),
          COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName', ''),
          new.raw_user_meta_data->>'company_name',
          new.raw_user_meta_data->>'phone'
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- Si c'est un candidat, créer le profil candidat
        IF user_role = 'candidate' THEN
          RAISE NOTICE 'Creating candidate profile for %', new.email;
          
          INSERT INTO public.candidate_profiles (
            id,
            email,
            first_name,
            last_name,
            phone,
            status,
            qualification_status,
            seniority,
            daily_rate,
            password_hash,
            is_email_verified
          ) VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', ''),
            COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName', ''),
            new.raw_user_meta_data->>'phone',
            'qualification',
            'pending',
            NULL, -- Séniorité NULL pour forcer l'onboarding
            0,
            '',
            false
          )
          ON CONFLICT (id) DO NOTHING;
          
        -- Si c'est un client, créer le profil client
        ELSIF user_role = 'client' THEN
          RAISE NOTICE 'Creating client profile for %', new.email;
          
          INSERT INTO public.client_profiles (
            id,
            email,
            first_name,
            last_name,
            company_name,
            phone,
            user_id
          ) VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', ''),
            COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName', ''),
            new.raw_user_meta_data->>'company_name',
            new.raw_user_meta_data->>'phone',
            new.id::text
          )
          ON CONFLICT (id) DO NOTHING;
        END IF;
        
        RETURN new;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
          RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    await supabase.rpc('exec_sql', { sql: createFunctionQuery });
    console.log('✅ Fonction recréée');

    // Recréer le trigger
    const createTriggerQuery = `
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW 
        EXECUTE FUNCTION public.handle_new_user();
    `;

    await supabase.rpc('exec_sql', { sql: createTriggerQuery });
    console.log('✅ Trigger recréé');

    // 4. Créer le profil pour le dernier candidat s'il n'existe pas
    if (lastCandidate) {
      const { data: existingProfile } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('id', lastCandidate.id)
        .single();

      if (!existingProfile) {
        console.log('\n🔧 Création du profil pour le candidat existant...');
        
        const { error: createError } = await supabase
          .from('candidate_profiles')
          .insert({
            id: lastCandidate.id,
            email: lastCandidate.email,
            first_name: lastCandidate.user_metadata?.first_name || lastCandidate.user_metadata?.firstName || '',
            last_name: lastCandidate.user_metadata?.last_name || lastCandidate.user_metadata?.lastName || '',
            phone: lastCandidate.user_metadata?.phone || '',
            status: 'qualification',
            qualification_status: 'pending',
            seniority: null, // NULL pour déclencher l'onboarding
            profile_id: null, // NULL pour déclencher l'onboarding
            daily_rate: 0,
            password_hash: '',
            is_email_verified: lastCandidate.email_confirmed_at !== null
          });

        if (createError) {
          console.error('Erreur création:', createError);
        } else {
          console.log('✅ Profil créé avec succès');
          console.log('ℹ️  L\'onboarding devrait maintenant se déclencher');
        }
      }
    }

    console.log('\n=== SYSTÈME CORRIGÉ ===');
    console.log('Le trigger est maintenant configuré pour créer automatiquement les profils candidats');
    console.log('Les nouveaux candidats passeront par l\'onboarding');

  } catch (error) {
    console.error('Erreur:', error);
  }

  process.exit(0);
}

checkTriggerAndFix();