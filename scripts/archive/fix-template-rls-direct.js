import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjUwODg0NiwiZXhwIjoyMDM4MDg0ODQ2fQ.OFhJLz5XnQUV4eDEJb4pVKHZeGp_RmAz1bgqkrW4R8w'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixTemplateRLS() {
  try {
    console.log('Fixing template RLS policies...')

    // 1. Supprimer les anciennes politiques
    console.log('Dropping old policies...')
    const dropPolicies = `
      DROP POLICY IF EXISTS "Admins can manage template categories" ON template_categories;
      DROP POLICY IF EXISTS "Admins can manage project templates" ON project_templates;
      DROP POLICY IF EXISTS "Users can view template categories" ON template_categories;
      DROP POLICY IF EXISTS "Users can view project templates" ON project_templates;
    `
    
    const { data: dropResult, error: dropError } = await supabase.rpc('sql_executor', { sql_query: dropPolicies })
    if (dropError) {
      console.error('Error dropping policies:', dropError)
    } else {
      console.log('✅ Old policies dropped')
    }

    // 2. Créer les nouvelles politiques pour les admins
    console.log('Creating admin policies...')
    const createAdminPolicies = `
      CREATE POLICY "Admins can manage template categories"
      ON template_categories FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'admin'
        )
      );

      CREATE POLICY "Admins can manage project templates"
      ON project_templates FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'admin'
        )
      );
    `
    
    const { data: adminResult, error: adminError } = await supabase.rpc('sql_executor', { sql_query: createAdminPolicies })
    if (adminError) {
      console.error('Error creating admin policies:', adminError)
    } else {
      console.log('✅ Admin policies created')
    }

    // 3. Créer les politiques de lecture pour tous les utilisateurs
    console.log('Creating read policies...')
    const createReadPolicies = `
      CREATE POLICY "Users can view template categories"
      ON template_categories FOR SELECT
      TO authenticated
      USING (true);

      CREATE POLICY "Users can view project templates"
      ON project_templates FOR SELECT
      TO authenticated
      USING (true);
    `
    
    const { data: readResult, error: readError } = await supabase.rpc('sql_executor', { sql_query: createReadPolicies })
    if (readError) {
      console.error('Error creating read policies:', readError)
    } else {
      console.log('✅ Read policies created')
    }

    // 4. Vérifier les politiques créées
    console.log('Checking created policies...')
    const { data: policies, error: policiesError } = await supabase.rpc('sql_executor', { 
      sql_query: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd
        FROM pg_policies 
        WHERE tablename IN ('template_categories', 'project_templates')
        ORDER BY tablename, policyname;
      `
    })

    if (policiesError) {
      console.error('Error checking policies:', policiesError)
    } else {
      console.log('✅ Current policies:')
      if (policies && Array.isArray(policies)) {
        policies.forEach(policy => {
          console.log(`- ${policy.tablename}: ${policy.policyname} (${policy.cmd})`)
        })
      }
    }

    console.log('✅ Template RLS policies fixed successfully!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

fixTemplateRLS()