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

    console.log('🔧 Application de la migration du trigger...');

    // 1. Supprimer les anciens triggers
    await supabase.rpc('exec_sql', {
      sql: 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;'
    });
    await supabase.rpc('exec_sql', {
      sql: 'DROP TRIGGER IF EXISTS handle_new_user ON auth.users;'
    });

    // 2. Créer la fonction
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      DECLARE
        user_role TEXT;
      BEGIN
        user_role := COALESCE(new.raw_user_meta_data->>'role', 'candidate');
        
        -- Créer le profil général
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
        
        -- Si candidat
        IF user_role = 'candidate' THEN
          INSERT INTO public.candidate_profiles (
            id, email, first_name, last_name, phone,
            status, qualification_status, seniority, profile_id,
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
            NULL,
            0,
            '',
            false
          ) ON CONFLICT (id) DO NOTHING;
          
        -- Si client
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
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
          RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    await supabase.rpc('exec_sql', { sql: createFunctionSQL });
    console.log('✅ Fonction créée');

    // 3. Créer le trigger
    const createTriggerSQL = `
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW 
        EXECUTE FUNCTION public.handle_new_user();
    `;

    await supabase.rpc('exec_sql', { sql: createTriggerSQL });
    console.log('✅ Trigger créé');

    // 4. Activer le trigger
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;'
    });
    console.log('✅ Trigger activé');

    // 5. Créer les profils manquants
    const { data: users } = await supabase.auth.admin.listUsers();
    let profilesCreated = 0;

    if (users?.users) {
      for (const user of users.users) {
        const role = user.user_metadata?.role || 'candidate';
        
        // Vérifier si le profil existe
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!existingProfile) {
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            role: role,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || ''
          });
        }

        // Si candidat, vérifier candidate_profiles
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
              first_name: user.user_metadata?.first_name || '',
              last_name: user.user_metadata?.last_name || '',
              status: 'disponible',
              qualification_status: 'pending',
              seniority: 'junior',
              profile_id: null,
              daily_rate: 0,
              password_hash: '',
              is_email_verified: user.email_confirmed_at !== null
            });
            profilesCreated++;
            console.log(`✅ Profil créé pour ${user.email}`);
          }
        }
      }
    }

    // 6. Vérifier le trigger
    const { data: triggerCheck } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT COUNT(*) as count 
        FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created';
      `
    });

    const triggerExists = triggerCheck?.rows?.[0]?.count > 0;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migration appliquée avec succès',
        details: {
          triggerCreated: triggerExists,
          profilesCreated,
          totalUsers: users?.users?.length || 0
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
        details: 'Erreur lors de l\'application de la migration'
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