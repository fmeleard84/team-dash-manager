import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjU5MzI0OSwiZXhwIjoyMDM4MTY5MjQ5fQ.9gBVwIIXW3fJB3YH9OobqpQjQUe-5ClW0oKJOQnfGGo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFix() {
  console.log('🔧 Application des corrections sur la table client_team_members...\n');
  
  try {
    // Utiliser la fonction exec_sql pour exécuter le SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- 1. Créer la table si elle n'existe pas
        CREATE TABLE IF NOT EXISTS public.client_team_members (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- 2. Ajouter les colonnes manquantes
        ALTER TABLE public.client_team_members 
        ADD COLUMN IF NOT EXISTS description TEXT;

        ALTER TABLE public.client_team_members 
        ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);

        ALTER TABLE public.client_team_members 
        ADD COLUMN IF NOT EXISTS department VARCHAR(255);

        ALTER TABLE public.client_team_members 
        ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT false;

        ALTER TABLE public.client_team_members 
        ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10, 2);

        -- 3. Créer les index
        CREATE INDEX IF NOT EXISTS idx_client_team_members_client_id 
          ON public.client_team_members(client_id);
          
        CREATE INDEX IF NOT EXISTS idx_client_team_members_email 
          ON public.client_team_members(email);
          
        CREATE UNIQUE INDEX IF NOT EXISTS idx_client_team_members_client_email 
          ON public.client_team_members(client_id, email);

        -- 4. Activer RLS
        ALTER TABLE public.client_team_members ENABLE ROW LEVEL SECURITY;

        -- 5. Supprimer et recréer les politiques
        DROP POLICY IF EXISTS "Clients can manage their own team members" 
          ON public.client_team_members;
        DROP POLICY IF EXISTS "Admin can view all team members" 
          ON public.client_team_members;

        CREATE POLICY "Clients can manage their own team members" 
          ON public.client_team_members
          FOR ALL
          USING (client_id = auth.uid())
          WITH CHECK (client_id = auth.uid());

        CREATE POLICY "Admin can view all team members" 
          ON public.client_team_members
          FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE profiles.id = auth.uid() 
              AND profiles.role IN ('admin', 'hr')
            )
          );

        -- 6. Créer ou remplacer la fonction de mise à jour du timestamp
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';

        -- 7. Créer le trigger
        DROP TRIGGER IF EXISTS update_client_team_members_updated_at 
          ON public.client_team_members;
          
        CREATE TRIGGER update_client_team_members_updated_at
          BEFORE UPDATE ON public.client_team_members
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

        -- 8. Activer le realtime
        DO $$
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.client_team_members;
        EXCEPTION
          WHEN duplicate_object THEN
            NULL;
        END $$;
      `
    });

    if (error) {
      console.error('❌ Erreur lors de l\'exécution:', error.message);
      console.log('\n📝 La fonction exec_sql n\'existe pas ou a échoué.');
      console.log('Création de la fonction exec_sql...\n');
      
      // Essayer de créer exec_sql d'abord
      const { error: createFuncError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
          RETURNS VOID AS $$
          BEGIN
            EXECUTE sql;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      });
      
      if (createFuncError) {
        console.log('❌ Impossible de créer exec_sql automatiquement.');
        console.log('\nVeuillez exécuter manuellement le script FIX_TEAM_MEMBERS_COMPLETE.sql dans Supabase SQL Editor.');
        return;
      }
      
      // Réessayer après avoir créé la fonction
      const { error: retryError } = await supabase.rpc('exec_sql', {
        sql: fixTableSQL
      });
      
      if (retryError) {
        console.error('❌ Échec même après création de exec_sql:', retryError.message);
        return;
      }
    }
    
    console.log('✅ Corrections appliquées avec succès!');
    
    // Vérifier la structure de la table
    const { data: testInsert, error: testError } = await supabase
      .from('client_team_members')
      .select('id, description, job_title')
      .limit(1);
    
    if (!testError) {
      console.log('✅ Table vérifiée - colonnes description et job_title présentes!');
      console.log('\n🎉 La table client_team_members est maintenant correctement configurée!');
      console.log('Vous pouvez maintenant ajouter des membres d\'équipe sans erreur.');
    } else {
      console.log('⚠️ Avertissement lors de la vérification:', testError.message);
    }
    
  } catch (err) {
    console.error('❌ Erreur inattendue:', err);
    console.log('\n📝 Veuillez exécuter manuellement le script FIX_TEAM_MEMBERS_COMPLETE.sql dans Supabase SQL Editor.');
  }
}

applyFix();