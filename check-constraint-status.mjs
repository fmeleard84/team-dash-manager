import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.mSV-u0PFD_wckrZs-KkULQAuqhJqMXlvVHgHGmvwjzI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkConstraint() {
  console.log('🔍 Vérification de la contrainte unique sur project_event_attendees...\n');

  try {
    // Vérifier les contraintes existantes via pg_constraint
    const { data: constraints, error } = await supabase.rpc('get_table_constraints', {
      table_name: 'project_event_attendees'
    }).catch(async () => {
      // Si la fonction n'existe pas, on la crée et on réessaye
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION get_table_constraints(table_name text)
        RETURNS TABLE(
          constraint_name text,
          constraint_type text,
          column_names text[]
        )
        LANGUAGE sql
        SECURITY DEFINER
        AS $$
          SELECT 
            con.conname::text as constraint_name,
            CASE con.contype
              WHEN 'p' THEN 'PRIMARY KEY'
              WHEN 'u' THEN 'UNIQUE'
              WHEN 'c' THEN 'CHECK'
              WHEN 'f' THEN 'FOREIGN KEY'
            END as constraint_type,
            ARRAY(
              SELECT a.attname::text
              FROM pg_attribute a
              WHERE a.attrelid = con.conrelid
              AND a.attnum = ANY(con.conkey)
            ) as column_names
          FROM pg_constraint con
          JOIN pg_class cls ON con.conrelid = cls.oid
          JOIN pg_namespace ns ON cls.relnamespace = ns.oid
          WHERE cls.relname = table_name
          AND ns.nspname = 'public';
        $$;
      `;

      await supabase.rpc('exec_sql', { sql: createFunctionSQL }).catch(() => {});
      
      // Réessayer
      return await supabase.rpc('get_table_constraints', {
        table_name: 'project_event_attendees'
      });
    });

    if (constraints && constraints.length > 0) {
      console.log('📋 Contraintes trouvées:');
      constraints.forEach(c => {
        console.log(`  - ${c.constraint_name} (${c.constraint_type}): ${c.column_names?.join(', ')}`);
      });
    } else {
      console.log('❌ Aucune contrainte trouvée ou erreur lors de la récupération');
    }

    // Test d'insertion pour vérifier le comportement
    console.log('\n🧪 Test d\'insertion avec ON CONFLICT...');
    
    // Récupérer un event_id existant pour le test
    const { data: events } = await supabase
      .from('project_events')
      .select('id')
      .limit(1);

    if (events && events.length > 0) {
      const testData = {
        event_id: events[0].id,
        user_id: '6352b49b-6bb2-40f0-a9fd-e83ea430be32', // L'ID du client dans les logs
        role: 'participant',
        required: true,
        response_status: 'pending'
      };

      // Essayer un upsert
      const { data, error: upsertError } = await supabase
        .from('project_event_attendees')
        .upsert([testData], {
          onConflict: 'event_id,user_id',
          ignoreDuplicates: false
        })
        .select();

      if (upsertError) {
        console.log('❌ Erreur UPSERT:', upsertError.message);
        console.log('   Code:', upsertError.code);
      } else {
        console.log('✅ UPSERT réussi !');
        // Nettoyer après le test
        if (data && data[0]) {
          await supabase
            .from('project_event_attendees')
            .delete()
            .eq('id', data[0].id);
        }
      }
    }

  } catch (err) {
    console.error('❌ Erreur:', err);
  }
}

checkConstraint();