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
    
    console.log('🔧 Application directe de la contrainte unique...');
    
    // Import du driver PostgreSQL Deno
    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    
    // Connexion à la base
    const client = new Client(DB_URL);
    await client.connect();
    
    const results = [];
    
    try {
      // 1. Supprimer les doublons (en gardant le plus ancien)
      console.log('1. Suppression des doublons...');
      await client.queryObject`
        DELETE FROM project_event_attendees a
        USING project_event_attendees b
        WHERE a.event_id = b.event_id 
        AND a.user_id = b.user_id
        AND a.created_at > b.created_at
      `;
      results.push('✅ Doublons supprimés');
      
      // 2. Supprimer les anciennes contraintes
      console.log('2. Suppression des anciennes contraintes...');
      await client.queryObject`
        ALTER TABLE project_event_attendees 
        DROP CONSTRAINT IF EXISTS project_event_attendees_event_user_unique
      `;
      await client.queryObject`
        ALTER TABLE project_event_attendees 
        DROP CONSTRAINT IF EXISTS project_event_attendees_event_email_unique
      `;
      await client.queryObject`
        ALTER TABLE project_event_attendees 
        DROP CONSTRAINT IF EXISTS project_event_attendees_event_profile_unique
      `;
      results.push('✅ Anciennes contraintes supprimées');
      
      // 3. Créer la nouvelle contrainte
      console.log('3. Création de la contrainte unique...');
      await client.queryObject`
        ALTER TABLE project_event_attendees 
        ADD CONSTRAINT project_event_attendees_event_user_unique 
        UNIQUE(event_id, user_id)
      `;
      results.push('✅ Contrainte unique créée');
      
      // 4. Créer les index
      console.log('4. Création des index...');
      await client.queryObject`
        CREATE INDEX IF NOT EXISTS idx_event_attendees_event_user 
        ON project_event_attendees(event_id, user_id)
      `;
      await client.queryObject`
        CREATE INDEX IF NOT EXISTS idx_event_attendees_event 
        ON project_event_attendees(event_id)
      `;
      await client.queryObject`
        CREATE INDEX IF NOT EXISTS idx_event_attendees_user 
        ON project_event_attendees(user_id)
      `;
      results.push('✅ Index créés');
      
      // 5. Vérifier la contrainte
      console.log('5. Vérification de la contrainte...');
      const constraintCheck = await client.queryObject`
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'project_event_attendees'::regclass 
        AND contype = 'u'
        AND conname = 'project_event_attendees_event_user_unique'
      `;
      
      if (constraintCheck.rows.length > 0) {
        results.push('✅ Contrainte vérifiée et active !');
      } else {
        results.push('⚠️ Contrainte créée mais non vérifiée');
      }
      
    } finally {
      await client.end();
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: '🎉 Contrainte unique appliquée avec succès !',
      results: results,
      instruction: 'Vous pouvez maintenant créer des événements avec des participants'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      hint: 'La base de données nécessite peut-être une intervention manuelle'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});