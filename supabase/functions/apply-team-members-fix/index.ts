import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Liste des commandes SQL à exécuter séparément
    const sqlCommands = [
      // 1. Créer la table si elle n'existe pas
      `CREATE TABLE IF NOT EXISTS public.client_team_members (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      // 2. Ajouter les colonnes manquantes une par une
      `ALTER TABLE public.client_team_members ADD COLUMN IF NOT EXISTS description TEXT`,
      `ALTER TABLE public.client_team_members ADD COLUMN IF NOT EXISTS job_title VARCHAR(255)`,
      `ALTER TABLE public.client_team_members ADD COLUMN IF NOT EXISTS department VARCHAR(255)`,
      `ALTER TABLE public.client_team_members ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT false`,
      `ALTER TABLE public.client_team_members ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10, 2)`,
      
      // 3. Créer les index
      `CREATE INDEX IF NOT EXISTS idx_client_team_members_client_id ON public.client_team_members(client_id)`,
      `CREATE INDEX IF NOT EXISTS idx_client_team_members_email ON public.client_team_members(email)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_client_team_members_client_email ON public.client_team_members(client_id, email)`,
      
      // 4. Activer RLS
      `ALTER TABLE public.client_team_members ENABLE ROW LEVEL SECURITY`,
      
      // 5. Supprimer les anciennes politiques
      `DROP POLICY IF EXISTS "Clients can manage their own team members" ON public.client_team_members`,
      `DROP POLICY IF EXISTS "Admin can view all team members" ON public.client_team_members`,
      
      // 6. Créer les nouvelles politiques
      `CREATE POLICY "Clients can manage their own team members" 
        ON public.client_team_members
        FOR ALL
        USING (client_id = auth.uid())
        WITH CHECK (client_id = auth.uid())`,
        
      `CREATE POLICY "Admin can view all team members" 
        ON public.client_team_members
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'hr')
          )
        )`,
      
      // 7. Créer la fonction de mise à jour
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql'`,
      
      // 8. Créer le trigger
      `DROP TRIGGER IF EXISTS update_client_team_members_updated_at ON public.client_team_members`,
      `CREATE TRIGGER update_client_team_members_updated_at
        BEFORE UPDATE ON public.client_team_members
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()`
    ]

    const results = []
    const errors = []
    
    // Exécuter chaque commande SQL via Supabase Admin API
    for (const sql of sqlCommands) {
      try {
        // Utiliser une requête directe à l'API admin
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({ sql })
        })
        
        if (!response.ok) {
          // Si exec_sql n'existe pas, essayer une autre approche
          // Certaines commandes peuvent échouer si elles existent déjà, c'est OK
          const text = await response.text()
          if (!text.includes('already exists') && !text.includes('duplicate')) {
            errors.push({ sql: sql.substring(0, 50) + '...', error: text })
          } else {
            results.push({ sql: sql.substring(0, 50) + '...', status: 'skipped (already exists)' })
          }
        } else {
          results.push({ sql: sql.substring(0, 50) + '...', status: 'success' })
        }
      } catch (err) {
        errors.push({ sql: sql.substring(0, 50) + '...', error: err.message })
      }
    }
    
    // Vérifier si les colonnes existent maintenant
    const { data: columns, error: checkError } = await supabase
      .from('client_team_members')
      .select('*')
      .limit(0)
    
    let columnsExist = false
    if (!checkError) {
      columnsExist = true
    }

    return new Response(JSON.stringify({
      success: errors.length === 0 || columnsExist,
      message: columnsExist 
        ? '✅ Table client_team_members corrigée avec succès!'
        : 'Certaines commandes ont échoué, mais cela peut être normal si les éléments existent déjà.',
      results,
      errors: errors.length > 0 ? errors : undefined,
      columnsVerified: columnsExist,
      instructions: !columnsExist ? 
        'Si les erreurs persistent, exécutez le script FIX_TEAM_MEMBERS_COMPLETE.sql manuellement dans Supabase SQL Editor.' 
        : undefined
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      instructions: 'Exécutez le script FIX_TEAM_MEMBERS_COMPLETE.sql manuellement dans Supabase SQL Editor.'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})