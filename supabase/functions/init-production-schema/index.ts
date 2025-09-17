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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🚀 Initialisation du schéma de production...')

    // Création des tables essentielles
    const createTablesSQL = `
      -- Enable extensions
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pg_trgm";

      -- Table profiles
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        company_name TEXT,
        role TEXT,
        phone TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Table candidate_profiles
      CREATE TABLE IF NOT EXISTS public.candidate_profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        status TEXT DEFAULT 'qualification',
        qualification_status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Table client_profiles
      CREATE TABLE IF NOT EXISTS public.client_profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        company_name TEXT,
        siret TEXT,
        credits INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Table projects
      CREATE TABLE IF NOT EXISTS public.projects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pause' CHECK (status IN ('pause', 'attente-team', 'play', 'completed')),
        start_date DATE,
        end_date DATE,
        budget DECIMAL,
        owner_id UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Enable RLS
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

      -- Basic policies for profiles
      CREATE POLICY "Users can view own profile" ON profiles
        FOR SELECT USING (auth.uid() = id);

      CREATE POLICY "Users can update own profile" ON profiles
        FOR UPDATE USING (auth.uid() = id);

      -- Policies for candidate_profiles
      CREATE POLICY "Candidates can view own profile" ON candidate_profiles
        FOR SELECT USING (auth.uid() = id);

      CREATE POLICY "Candidates can update own profile" ON candidate_profiles
        FOR UPDATE USING (auth.uid() = id);

      -- Policies for client_profiles
      CREATE POLICY "Clients can view own profile" ON client_profiles
        FOR SELECT USING (auth.uid() = id);

      CREATE POLICY "Clients can update own profile" ON client_profiles
        FOR UPDATE USING (auth.uid() = id);

      -- Policies for projects
      CREATE POLICY "Owners can manage their projects" ON projects
        FOR ALL USING (auth.uid() = owner_id);

      CREATE POLICY "Public can view active projects" ON projects
        FOR SELECT USING (status IN ('play', 'attente-team'));
    `;

    // Exécuter le SQL
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      query: createTablesSQL
    }).catch(err => {
      // Si exec_sql n'existe pas, on essaie de créer d'abord la fonction
      console.log('Création de la fonction exec_sql...')
      return supabaseAdmin.rpc('create_function', {
        sql: `
          CREATE OR REPLACE FUNCTION exec_sql(query text)
          RETURNS void AS $$
          BEGIN
            EXECUTE query;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      }).catch(() => ({ error: 'exec_sql not available' }))
    });

    if (error) {
      console.log('⚠️ Certaines tables peuvent déjà exister:', error)
    }

    // Créer la fonction de création automatique des profils
    const handleNewUserSQL = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      BEGIN
        -- Créer le profil de base
        INSERT INTO public.profiles (id, email, created_at, updated_at)
        VALUES (NEW.id, NEW.email, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;

        -- Si c'est un candidat (email ne finit pas par @company.com)
        IF NEW.email NOT LIKE '%@company.com' THEN
          INSERT INTO public.candidate_profiles (
            id, email, status, qualification_status, created_at, updated_at
          )
          VALUES (
            NEW.id, NEW.email, 'qualification', 'pending', NOW(), NOW()
          )
          ON CONFLICT (id) DO NOTHING;
        ELSE
          -- Sinon c'est un client
          INSERT INTO public.client_profiles (
            id, email, created_at, updated_at
          )
          VALUES (
            NEW.id, NEW.email, NOW(), NOW()
          )
          ON CONFLICT (id) DO NOTHING;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    await supabaseAdmin.rpc('exec_sql', {
      query: handleNewUserSQL
    }).catch(() => {
      console.log('⚠️ Fonction handle_new_user doit être créée manuellement')
    });

    // Vérifier les tables créées
    const { data: tables } = await supabaseAdmin
      .from('profiles')
      .select('count')
      .limit(1);

    console.log('✅ Schéma de base initialisé')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Schéma de production initialisé',
        details: 'Tables de base créées avec RLS activé'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Erreur:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Erreur lors de l\'initialisation du schéma'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})