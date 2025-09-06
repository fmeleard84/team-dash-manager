import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔧 CORRECTION PERMANENTE DU SYSTÈME DE CRÉATION DE PROFILS');

    // 1. D'abord, récupérer l'ID du candidat problématique depuis le body si fourni
    const body = await req.json().catch(() => ({}));
    const targetCandidateEmail = body.email || 'fmeleard+new_cdp_id3@gmail.com';

    // 2. Supprimer tous les anciens triggers
    console.log('\n1️⃣ Suppression des anciens triggers...');
    const dropTriggers = [
      'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;',
      'DROP TRIGGER IF EXISTS handle_new_user ON auth.users CASCADE;',
      'DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;'
    ];

    for (const sql of dropTriggers) {
      try {
        await supabase.rpc('exec_sql', { sql });
      } catch (e) {
        console.log('Note:', e.message);
      }
    }

    // 3. Créer la fonction de gestion des nouveaux utilisateurs
    console.log('2️⃣ Création de la fonction handle_new_user...');
    const createFunction = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      DECLARE
        user_role TEXT;
      BEGIN
        -- Déterminer le rôle
        user_role := COALESCE(
          new.raw_user_meta_data->>'role',
          new.raw_app_meta_data->>'role',
          'candidate'
        );
        
        -- Créer le profil général
        INSERT INTO public.profiles (
          id, email, role, first_name, last_name, phone, company_name
        ) VALUES (
          new.id,
          new.email,
          user_role::app_role,
          COALESCE(
            new.raw_user_meta_data->>'first_name',
            new.raw_user_meta_data->>'firstName',
            ''
          ),
          COALESCE(
            new.raw_user_meta_data->>'last_name',
            new.raw_user_meta_data->>'lastName',
            ''
          ),
          new.raw_user_meta_data->>'phone',
          new.raw_user_meta_data->>'company_name'
        ) ON CONFLICT (id) DO UPDATE SET
          role = EXCLUDED.role,
          first_name = COALESCE(NULLIF(profiles.first_name, ''), EXCLUDED.first_name),
          last_name = COALESCE(NULLIF(profiles.last_name, ''), EXCLUDED.last_name),
          phone = COALESCE(profiles.phone, EXCLUDED.phone);
        
        -- Si c'est un candidat, créer le profil candidat
        IF user_role = 'candidate' THEN
          INSERT INTO public.candidate_profiles (
            id, email, first_name, last_name, phone,
            status, qualification_status, seniority, profile_id,
            daily_rate, password_hash, is_email_verified
          ) VALUES (
            new.id,
            new.email,
            COALESCE(
              new.raw_user_meta_data->>'first_name',
              new.raw_user_meta_data->>'firstName',
              ''
            ),
            COALESCE(
              new.raw_user_meta_data->>'last_name',
              new.raw_user_meta_data->>'lastName',
              ''
            ),
            new.raw_user_meta_data->>'phone',
            'disponible',
            'pending',
            'junior',
            NULL,
            0,
            '',
            new.email_confirmed_at IS NOT NULL
          ) ON CONFLICT (id) DO UPDATE SET
            is_email_verified = new.email_confirmed_at IS NOT NULL;
        
        -- Si c'est un client, créer le profil client
        ELSIF user_role = 'client' THEN
          INSERT INTO public.client_profiles (
            id, email, first_name, last_name, company_name, phone, user_id
          ) VALUES (
            new.id,
            new.email,
            COALESCE(
              new.raw_user_meta_data->>'first_name',
              new.raw_user_meta_data->>'firstName',
              ''
            ),
            COALESCE(
              new.raw_user_meta_data->>'last_name',
              new.raw_user_meta_data->>'lastName',
              ''
            ),
            new.raw_user_meta_data->>'company_name',
            new.raw_user_meta_data->>'phone',
            new.id::text
          ) ON CONFLICT (id) DO NOTHING;
        END IF;
        
        RETURN new;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Erreur dans handle_new_user pour %: %', new.email, SQLERRM;
          RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: funcError } = await supabase.rpc('exec_sql', { sql: createFunction });
    if (funcError) {
      console.error('Erreur création fonction:', funcError);
    } else {
      console.log('✅ Fonction créée');
    }

    // 4. Créer le trigger
    console.log('3️⃣ Création du trigger...');
    const createTrigger = `
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_user();
    `;

    const { error: triggerError } = await supabase.rpc('exec_sql', { sql: createTrigger });
    if (triggerError) {
      console.error('Erreur création trigger:', triggerError);
    } else {
      console.log('✅ Trigger créé');
    }

    // 5. Activer le trigger
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;'
    });
    console.log('✅ Trigger activé');

    // 6. Corriger tous les utilisateurs existants sans profil
    console.log('\n4️⃣ Correction des utilisateurs existants...');
    const { data: { users } } = await supabase.auth.admin.listUsers();
    
    let fixedCount = 0;
    if (users) {
      for (const user of users) {
        const role = user.user_metadata?.role || 'candidate';
        
        // Vérifier et créer le profil général
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();
        
        if (!profile) {
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            role: role,
            first_name: user.user_metadata?.first_name || user.user_metadata?.firstName || '',
            last_name: user.user_metadata?.last_name || user.user_metadata?.lastName || '',
            phone: user.user_metadata?.phone
          });
          console.log(`✅ Profil créé pour ${user.email}`);
          fixedCount++;
        }
        
        // Si candidat, créer le profil candidat
        if (role === 'candidate') {
          const { data: candidateProfile } = await supabase
            .from('candidate_profiles')
            .select('id')
            .eq('id', user.id)
            .single();
          
          if (!candidateProfile) {
            await supabase.from('candidate_profiles').insert({
              id: user.id,
              email: user.email || '',
              first_name: user.user_metadata?.first_name || user.user_metadata?.firstName || '',
              last_name: user.user_metadata?.last_name || user.user_metadata?.lastName || '',
              phone: user.user_metadata?.phone || '',
              status: 'disponible',
              qualification_status: 'pending',
              seniority: 'junior',
              profile_id: null,
              daily_rate: 0,
              password_hash: '',
              is_email_verified: user.email_confirmed_at !== null
            });
            console.log(`✅ Profil candidat créé pour ${user.email}`);
            fixedCount++;
          }
        }
      }
    }

    // 7. Vérifier que le trigger existe
    const { data: triggerCheck } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.tgname AS trigger_name,
          t.tgenabled AS enabled
        FROM pg_trigger t
        WHERE t.tgname = 'on_auth_user_created';
      `
    });

    const triggerExists = triggerCheck?.rows?.length > 0;
    const triggerEnabled = triggerCheck?.rows?.[0]?.enabled === 'O';

    // 8. Vérifier spécifiquement le candidat problématique
    let targetUserFixed = false;
    if (targetCandidateEmail) {
      const { data: targetUser } = await supabase.auth.admin.listUsers();
      const candidate = targetUser?.users?.find(u => u.email === targetCandidateEmail);
      
      if (candidate) {
        const { data: candidateProfile } = await supabase
          .from('candidate_profiles')
          .select('id, email, status')
          .eq('id', candidate.id)
          .single();
        
        targetUserFixed = !!candidateProfile;
        console.log(`\n📧 Candidat ${targetCandidateEmail}:`, targetUserFixed ? '✅ Profil OK' : '❌ Profil manquant');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Système de création de profils corrigé',
        details: {
          triggerExists,
          triggerEnabled,
          profilesFixed: fixedCount,
          totalUsers: users?.length || 0,
          targetUserFixed
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Erreur lors de la correction du système'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    );
  }
});