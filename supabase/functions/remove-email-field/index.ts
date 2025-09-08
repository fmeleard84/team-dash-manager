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
    
    console.log('🔧 Suppression des colonnes obsolètes de project_event_attendees...');
    
    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    const client = new Client(DB_URL);
    await client.connect();
    
    const results = [];
    
    try {
      // 1. Vérifier que user_id est bien présent partout
      console.log('1. Vérification de user_id...');
      const checkResult = await client.queryObject`
        SELECT COUNT(*) as missing_count
        FROM project_event_attendees
        WHERE user_id IS NULL
      `;
      
      if (checkResult.rows[0].missing_count > 0) {
        throw new Error(`${checkResult.rows[0].missing_count} lignes sans user_id détectées`);
      }
      results.push('✅ Tous les enregistrements ont un user_id');
      
      // 2. Supprimer la colonne email
      console.log('2. Suppression de la colonne email...');
      try {
        await client.queryObject`
          ALTER TABLE project_event_attendees 
          DROP COLUMN IF EXISTS email CASCADE
        `;
        results.push('✅ Colonne email supprimée');
      } catch (e) {
        results.push(`⚠️ Colonne email: ${e.message}`);
      }
      
      // 3. Supprimer la colonne profile_id
      console.log('3. Suppression de la colonne profile_id...');
      try {
        await client.queryObject`
          ALTER TABLE project_event_attendees 
          DROP COLUMN IF EXISTS profile_id CASCADE
        `;
        results.push('✅ Colonne profile_id supprimée');
      } catch (e) {
        results.push(`⚠️ Colonne profile_id: ${e.message}`);
      }
      
      // 4. Recréer la contrainte unique proprement
      console.log('4. Recréation de la contrainte unique...');
      
      // Supprimer les anciennes contraintes
      await client.queryObject`
        ALTER TABLE project_event_attendees 
        DROP CONSTRAINT IF EXISTS project_event_attendees_event_user_key
      `;
      await client.queryObject`
        ALTER TABLE project_event_attendees 
        DROP CONSTRAINT IF EXISTS project_event_attendees_event_user_unique
      `;
      
      // Créer la nouvelle contrainte
      await client.queryObject`
        ALTER TABLE project_event_attendees 
        ADD CONSTRAINT project_event_attendees_event_user_key 
        UNIQUE(event_id, user_id)
      `;
      results.push('✅ Contrainte unique recréée');
      
      // 5. Ajouter les clés étrangères
      console.log('5. Configuration des clés étrangères...');
      
      // Event FK
      await client.queryObject`
        ALTER TABLE project_event_attendees
        DROP CONSTRAINT IF EXISTS project_event_attendees_event_id_fkey
      `;
      await client.queryObject`
        ALTER TABLE project_event_attendees
        ADD CONSTRAINT project_event_attendees_event_id_fkey 
        FOREIGN KEY (event_id) REFERENCES project_events(id) ON DELETE CASCADE
      `;
      
      // User FK
      await client.queryObject`
        ALTER TABLE project_event_attendees
        DROP CONSTRAINT IF EXISTS project_event_attendees_user_id_fkey
      `;
      await client.queryObject`
        ALTER TABLE project_event_attendees
        ADD CONSTRAINT project_event_attendees_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
      `;
      results.push('✅ Clés étrangères configurées');
      
      // 6. Créer les index
      console.log('6. Création des index...');
      await client.queryObject`
        CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id 
        ON project_event_attendees(event_id)
      `;
      await client.queryObject`
        CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id 
        ON project_event_attendees(user_id)
      `;
      await client.queryObject`
        CREATE INDEX IF NOT EXISTS idx_event_attendees_event_user 
        ON project_event_attendees(event_id, user_id)
      `;
      results.push('✅ Index créés');
      
      // 7. Vérifier la structure finale
      console.log('7. Vérification de la structure finale...');
      const columnsResult = await client.queryObject`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'project_event_attendees'
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `;
      
      const columns = columnsResult.rows.map(r => r.column_name);
      results.push(`✅ Colonnes finales: ${columns.join(', ')}`);
      
      // Vérifier que email et profile_id ne sont plus là
      if (!columns.includes('email') && !columns.includes('profile_id')) {
        results.push('✅ Colonnes obsolètes supprimées avec succès');
      }
      
    } finally {
      await client.end();
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: '🎉 Structure nettoyée avec succès !',
      results: results,
      instruction: 'La table est maintenant prête pour les insertions'
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