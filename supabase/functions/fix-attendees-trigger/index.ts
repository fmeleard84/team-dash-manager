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
    
    console.log('🔧 Recherche et suppression des triggers problématiques...');
    
    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    const client = new Client(DB_URL);
    await client.connect();
    
    const results = [];
    
    try {
      // 1. Identifier tous les triggers sur project_event_attendees
      console.log('1. Identification des triggers...');
      const triggersQuery = await client.queryObject(`
        SELECT 
          t.tgname as trigger_name,
          p.proname as function_name
        FROM pg_trigger t
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE t.tgrelid = 'project_event_attendees'::regclass
        AND NOT t.tgisinternal
      `);
      
      if (triggersQuery.rows.length > 0) {
        results.push(`📋 ${triggersQuery.rows.length} triggers trouvés sur project_event_attendees`);
        
        for (const trigger of triggersQuery.rows) {
          results.push(`  - Trigger: ${trigger.trigger_name} -> Function: ${trigger.function_name}`);
          
          // Récupérer le code de la fonction
          try {
            const funcDefQuery = await client.queryObject(`
              SELECT pg_get_functiondef(oid) as definition
              FROM pg_proc
              WHERE proname = $1
            `, [trigger.function_name]);
            
            if (funcDefQuery.rows.length > 0) {
              const definition = funcDefQuery.rows[0].definition;
              
              // Vérifier si la fonction référence NEW.email ou OLD.email
              if (definition.includes('NEW.email') || definition.includes('OLD.email')) {
                results.push(`    ⚠️ TROUVÉ: Cette fonction référence .email !`);
                
                // Supprimer le trigger
                await client.queryObject(`
                  DROP TRIGGER IF EXISTS ${trigger.trigger_name} 
                  ON project_event_attendees CASCADE
                `);
                results.push(`    ✅ Trigger ${trigger.trigger_name} supprimé`);
                
                // Optionnel: supprimer aussi la fonction si elle n'est plus utilisée
                try {
                  await client.queryObject(`
                    DROP FUNCTION IF EXISTS ${trigger.function_name}() CASCADE
                  `);
                  results.push(`    ✅ Fonction ${trigger.function_name} supprimée`);
                } catch (e) {
                  // La fonction peut être utilisée ailleurs
                  results.push(`    ℹ️ Fonction conservée (peut être utilisée ailleurs)`);
                }
              }
            }
          } catch (e) {
            results.push(`    ❌ Erreur lors de l'analyse: ${e.message}`);
          }
        }
      } else {
        results.push('✅ Aucun trigger trouvé sur project_event_attendees');
      }
      
      // 2. Rechercher directement les fonctions qui référencent project_event_attendees et email
      console.log('2. Recherche de fonctions problématiques...');
      const functionsQuery = await client.queryObject(`
        SELECT 
          p.proname as function_name,
          n.nspname as schema_name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE pg_get_functiondef(p.oid) LIKE '%project_event_attendees%'
        AND pg_get_functiondef(p.oid) LIKE '%NEW.email%'
      `);
      
      if (functionsQuery.rows.length > 0) {
        results.push(`⚠️ ${functionsQuery.rows.length} fonctions référencent encore NEW.email`);
        for (const func of functionsQuery.rows) {
          results.push(`  - ${func.schema_name}.${func.function_name}`);
          
          // Tenter de supprimer la fonction
          try {
            await client.queryObject(`
              DROP FUNCTION IF EXISTS ${func.schema_name}.${func.function_name} CASCADE
            `);
            results.push(`    ✅ Fonction supprimée`);
          } catch (e) {
            results.push(`    ❌ Impossible de supprimer: ${e.message}`);
          }
        }
      } else {
        results.push('✅ Aucune fonction problématique trouvée');
      }
      
      // 3. Supprimer TOUS les triggers sur project_event_attendees par précaution
      console.log('3. Nettoyage complet des triggers...');
      const allTriggersQuery = await client.queryObject(`
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'project_event_attendees'::regclass
        AND NOT tgisinternal
      `);
      
      let triggerCount = 0;
      for (const trigger of allTriggersQuery.rows) {
        try {
          await client.queryObject(`
            DROP TRIGGER IF EXISTS ${trigger.tgname} 
            ON project_event_attendees CASCADE
          `);
          triggerCount++;
        } catch (e) {
          // Ignorer les erreurs
        }
      }
      
      if (triggerCount > 0) {
        results.push(`🧹 ${triggerCount} triggers supprimés sur project_event_attendees`);
      }
      
      // 4. Test d'insertion final
      console.log('4. Test d\'insertion...');
      try {
        const eventQuery = await client.queryObject(`
          SELECT id FROM project_events LIMIT 1
        `);
        
        if (eventQuery.rows.length > 0) {
          const testUserId = '99999999-9999-9999-9999-999999999999';
          
          // Nettoyer d'abord
          await client.queryObject(`
            DELETE FROM project_event_attendees 
            WHERE user_id = $1
          `, [testUserId]);
          
          // Tester l'insertion
          await client.queryObject(`
            INSERT INTO project_event_attendees 
            (event_id, user_id, role, required, response_status)
            VALUES ($1, $2, 'test', true, 'pending')
          `, [eventQuery.rows[0].id, testUserId]);
          
          // Nettoyer
          await client.queryObject(`
            DELETE FROM project_event_attendees 
            WHERE user_id = $1
          `, [testUserId]);
          
          results.push('✅ Test d\'insertion réussi ! Le problème est résolu.');
        }
      } catch (e) {
        results.push(`❌ Test d'insertion échoué: ${e.message}`);
        results.push('Le problème persiste, une intervention manuelle peut être nécessaire');
      }
      
    } finally {
      await client.end();
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: '🎉 Triggers nettoyés !',
      results: results,
      instruction: 'Testez maintenant la création d\'événements'
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