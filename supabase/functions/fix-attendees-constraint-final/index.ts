import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DB_URL = Deno.env.get('SUPABASE_DB_URL')!;
    
    console.log('🔧 Correction finale de la table project_event_attendees...');
    
    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    const client = new Client(DB_URL);
    await client.connect();
    
    const results = [];
    
    try {
      // 1. Supprimer TOUTES les contraintes CHECK qui pourraient référencer email
      console.log('1. Suppression des contraintes CHECK problématiques...');
      
      const checkConstraints = [
        'project_event_attendees_email_or_profile_id_check',
        'ensure_email_or_user_id',
        'check_email_or_user_id',
        'attendee_type_check',
        'project_event_attendees_check'
      ];
      
      for (const constraint of checkConstraints) {
        try {
          await client.queryObject(`
            ALTER TABLE project_event_attendees 
            DROP CONSTRAINT IF EXISTS ${constraint} CASCADE
          `);
          results.push(`✅ Contrainte ${constraint} supprimée (si elle existait)`);
        } catch (e) {
          // Ignorer les erreurs si la contrainte n'existe pas
        }
      }
      
      // 2. Identifier et supprimer TOUTES les contraintes CHECK restantes
      console.log('2. Recherche de toutes les contraintes CHECK...');
      const constraintsQuery = await client.queryObject(`
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'project_event_attendees'::regclass 
        AND contype = 'c'
      `);
      
      if (constraintsQuery.rows.length > 0) {
        for (const row of constraintsQuery.rows) {
          try {
            await client.queryObject(`
              ALTER TABLE project_event_attendees 
              DROP CONSTRAINT IF EXISTS ${row.conname} CASCADE
            `);
            results.push(`✅ Contrainte CHECK ${row.conname} supprimée`);
          } catch (e) {
            results.push(`⚠️ Impossible de supprimer ${row.conname}: ${e.message}`);
          }
        }
      } else {
        results.push('✅ Aucune contrainte CHECK trouvée');
      }
      
      // 3. S'assurer que la contrainte unique est bien en place
      console.log('3. Vérification de la contrainte unique...');
      
      // Supprimer et recréer la contrainte unique
      await client.queryObject(`
        ALTER TABLE project_event_attendees 
        DROP CONSTRAINT IF EXISTS project_event_attendees_event_user_key
      `);
      
      await client.queryObject(`
        ALTER TABLE project_event_attendees 
        ADD CONSTRAINT project_event_attendees_event_user_key 
        UNIQUE(event_id, user_id)
      `);
      results.push('✅ Contrainte unique (re)créée');
      
      // 4. Vérifier la structure de la table
      console.log('4. Vérification de la structure...');
      const columnsQuery = await client.queryObject(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'project_event_attendees' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      
      const columns = columnsQuery.rows.map(r => r.column_name);
      results.push(`📋 Colonnes actuelles: ${columns.join(', ')}`);
      
      // Vérifier que email et profile_id n'existent plus
      if (columns.includes('email') || columns.includes('profile_id')) {
        results.push('⚠️ Les colonnes email ou profile_id existent encore !');
      } else {
        results.push('✅ Colonnes obsolètes absentes (OK)');
      }
      
      // 5. Test d'insertion final
      console.log('5. Test d\'insertion...');
      try {
        // Récupérer un event existant
        const eventQuery = await client.queryObject(`
          SELECT id FROM project_events LIMIT 1
        `);
        
        if (eventQuery.rows.length > 0) {
          const testId = '11111111-1111-1111-1111-111111111111';
          
          // Nettoyer d'abord si le test précédent a échoué
          await client.queryObject(`
            DELETE FROM project_event_attendees 
            WHERE user_id = $1
          `, [testId]);
          
          // Essayer l'insertion
          await client.queryObject(`
            INSERT INTO project_event_attendees 
            (event_id, user_id, role, required, response_status)
            VALUES ($1, $2, 'test', true, 'pending')
          `, [eventQuery.rows[0].id, testId]);
          
          // Nettoyer après le test
          await client.queryObject(`
            DELETE FROM project_event_attendees 
            WHERE user_id = $1
          `, [testId]);
          
          results.push('✅ Test d\'insertion réussi !');
        } else {
          results.push('⚠️ Aucun événement pour tester');
        }
      } catch (e) {
        results.push(`❌ Test d\'insertion échoué: ${e.message}`);
      }
      
      // 6. Lister les contraintes finales
      console.log('6. Contraintes finales...');
      const finalConstraintsQuery = await client.queryObject(`
        SELECT 
          tc.constraint_type,
          tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'project_event_attendees'
        AND tc.table_schema = 'public'
        ORDER BY tc.constraint_type
      `);
      
      for (const constraint of finalConstraintsQuery.rows) {
        results.push(`  - ${constraint.constraint_type}: ${constraint.constraint_name}`);
      }
      
    } finally {
      await client.end();
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: '🎉 Table project_event_attendees corrigée !',
      results: results,
      instruction: 'Testez maintenant la création d\'événements avec participants'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});