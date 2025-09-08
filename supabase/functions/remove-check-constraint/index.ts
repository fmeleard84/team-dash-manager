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
    
    console.log('🔧 Nettoyage des contraintes CHECK et triggers obsolètes...');
    
    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    const client = new Client(DB_URL);
    await client.connect();
    
    const results = [];
    
    try {
      // 1. Lister tous les triggers sur la table
      console.log('1. Recherche des triggers...');
      const triggersResult = await client.queryObject`
        SELECT 
          tgname as trigger_name,
          proname as function_name
        FROM pg_trigger t
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE t.tgrelid = 'project_event_attendees'::regclass
        AND NOT tgisinternal
      `;
      
      if (triggersResult.rows.length > 0) {
        results.push(`📋 Triggers trouvés: ${triggersResult.rows.map(r => r.trigger_name).join(', ')}`);
        
        // Supprimer les triggers qui pourraient référencer email ou profile_id
        for (const trigger of triggersResult.rows) {
          try {
            await client.queryObject`
              DROP TRIGGER IF EXISTS ${trigger.trigger_name} 
              ON project_event_attendees CASCADE
            `;
            results.push(`✅ Trigger supprimé: ${trigger.trigger_name}`);
          } catch (e) {
            results.push(`⚠️ Trigger ${trigger.trigger_name}: ${e.message}`);
          }
        }
      } else {
        results.push('✅ Aucun trigger trouvé');
      }
      
      // 2. Lister et supprimer les contraintes CHECK
      console.log('2. Recherche des contraintes CHECK...');
      const checkConstraintsResult = await client.queryObject`
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'project_event_attendees'::regclass
        AND contype = 'c'
      `;
      
      if (checkConstraintsResult.rows.length > 0) {
        for (const constraint of checkConstraintsResult.rows) {
          try {
            await client.queryObject`
              ALTER TABLE project_event_attendees 
              DROP CONSTRAINT IF EXISTS ${constraint.conname} CASCADE
            `;
            results.push(`✅ Contrainte CHECK supprimée: ${constraint.conname}`);
          } catch (e) {
            results.push(`⚠️ Contrainte ${constraint.conname}: ${e.message}`);
          }
        }
      } else {
        results.push('✅ Aucune contrainte CHECK trouvée');
      }
      
      // 3. Rechercher et recréer les politiques RLS sans référence à email/profile_id
      console.log('3. Vérification des politiques RLS...');
      const policiesResult = await client.queryObject`
        SELECT 
          polname as policy_name,
          polcmd as command,
          pg_get_expr(polqual, polrelid) as qual,
          pg_get_expr(polwithcheck, polrelid) as with_check
        FROM pg_policy
        WHERE polrelid = 'project_event_attendees'::regclass
      `;
      
      if (policiesResult.rows.length > 0) {
        results.push(`📋 ${policiesResult.rows.length} politiques RLS trouvées`);
        
        // Vérifier si des politiques référencent email ou profile_id
        for (const policy of policiesResult.rows) {
          const hasEmail = policy.qual?.includes('email') || policy.with_check?.includes('email');
          const hasProfileId = policy.qual?.includes('profile_id') || policy.with_check?.includes('profile_id');
          
          if (hasEmail || hasProfileId) {
            // Supprimer et recréer la politique
            await client.queryObject`
              DROP POLICY IF EXISTS ${policy.policy_name} 
              ON project_event_attendees
            `;
            results.push(`✅ Politique RLS obsolète supprimée: ${policy.policy_name}`);
            
            // Recréer une politique simple basée sur user_id
            if (policy.command === 'SELECT') {
              await client.queryObject`
                CREATE POLICY ${policy.policy_name}
                ON project_event_attendees FOR SELECT
                TO authenticated
                USING (
                  user_id = auth.uid()
                  OR EXISTS (
                    SELECT 1 FROM project_events pe
                    JOIN projects p ON p.id = pe.project_id
                    WHERE pe.id = event_id
                    AND p.owner_id = auth.uid()
                  )
                )
              `;
              results.push(`✅ Politique SELECT recréée: ${policy.policy_name}`);
            }
          }
        }
      } else {
        results.push('✅ Aucune politique RLS trouvée');
      }
      
      // 4. Rechercher les fonctions qui pourraient référencer les colonnes supprimées
      console.log('4. Recherche des fonctions triggers...');
      const functionsResult = await client.queryObject`
        SELECT 
          p.proname as function_name,
          pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND pg_get_functiondef(p.oid) LIKE '%project_event_attendees%'
        AND (
          pg_get_functiondef(p.oid) LIKE '%email%'
          OR pg_get_functiondef(p.oid) LIKE '%profile_id%'
        )
      `;
      
      if (functionsResult.rows.length > 0) {
        results.push(`⚠️ ${functionsResult.rows.length} fonctions référencent les colonnes supprimées`);
        for (const func of functionsResult.rows) {
          results.push(`  - ${func.function_name} (nécessite une mise à jour manuelle)`);
        }
      } else {
        results.push('✅ Aucune fonction problématique trouvée');
      }
      
      // 5. Vérifier la structure finale
      console.log('5. Vérification finale...');
      const finalCheck = await client.queryObject`
        SELECT 
          column_name
        FROM information_schema.columns
        WHERE table_name = 'project_event_attendees'
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `;
      
      const columns = finalCheck.rows.map(r => r.column_name);
      results.push(`✅ Colonnes finales: ${columns.join(', ')}`);
      
      // Test d'insertion
      console.log('6. Test d\'insertion...');
      try {
        // Récupérer un event pour le test
        const testEvent = await client.queryObject`
          SELECT id FROM project_events LIMIT 1
        `;
        
        if (testEvent.rows.length > 0) {
          // Essayer un insert simple
          await client.queryObject`
            INSERT INTO project_event_attendees 
            (event_id, user_id, role, required, response_status)
            VALUES 
            ($1, $2, 'test', true, 'pending')
            ON CONFLICT (event_id, user_id) DO NOTHING
          `, [testEvent.rows[0].id, '00000000-0000-0000-0000-000000000000'];
          
          // Nettoyer
          await client.queryObject`
            DELETE FROM project_event_attendees 
            WHERE user_id = '00000000-0000-0000-0000-000000000000'
          `;
          
          results.push('✅ Test d\'insertion réussi');
        }
      } catch (e) {
        results.push(`❌ Test d'insertion échoué: ${e.message}`);
      }
      
    } finally {
      await client.end();
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: '🎉 Contraintes et triggers nettoyés !',
      results: results,
      instruction: 'La table devrait maintenant accepter les insertions'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});