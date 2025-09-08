import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.mSV-u0PFD_wckrZs-KkULQAuqhJqMXlvVHgHGmvwjzI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndTest() {
  console.log('🔍 Analyse du problème de contrainte unique...\n');

  try {
    // 1. Récupérer un événement existant
    console.log('1️⃣ Récupération d\'un événement existant...');
    const { data: events, error: eventError } = await supabase
      .from('project_events')
      .select('id, title')
      .limit(1);

    if (eventError) {
      console.error('Erreur récupération événement:', eventError);
      return;
    }

    if (!events || events.length === 0) {
      console.log('Aucun événement trouvé');
      return;
    }

    const eventId = events[0].id;
    console.log(`   Event trouvé: ${events[0].title} (${eventId})`);

    // 2. Essayer un insert simple
    console.log('\n2️⃣ Test d\'insertion simple...');
    const testData = {
      event_id: eventId,
      user_id: '6352b49b-6bb2-40f0-a9fd-e83ea430be32',
      role: 'participant',
      required: true,
      response_status: 'pending'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('project_event_attendees')
      .insert([testData])
      .select();

    if (insertError) {
      console.log('   ❌ Erreur insertion:', insertError.message);
      console.log('   Code:', insertError.code);
      
      // Si c'est une erreur de duplication, c'est bon signe (la contrainte existe)
      if (insertError.code === '23505') {
        console.log('   ✅ La contrainte unique existe bien !');
        console.log('   Le problème vient du code qui utilise ON CONFLICT');
      }
    } else {
      console.log('   ✅ Insertion réussie');
      console.log('   ID créé:', insertData[0].id);
      
      // 3. Essayer un upsert maintenant
      console.log('\n3️⃣ Test d\'UPSERT avec onConflict...');
      testData.role = 'organizer'; // Modifier pour voir l'update
      
      const { data: upsertData, error: upsertError } = await supabase
        .from('project_event_attendees')
        .upsert([testData], {
          onConflict: 'event_id,user_id'
        })
        .select();

      if (upsertError) {
        console.log('   ❌ Erreur UPSERT:', upsertError.message);
        console.log('   Code:', upsertError.code);
      } else {
        console.log('   ✅ UPSERT réussi !');
        console.log('   Role mis à jour:', upsertData[0].role);
      }

      // Nettoyer
      await supabase
        .from('project_event_attendees')
        .delete()
        .eq('id', insertData[0].id);
      console.log('\n🧹 Données de test nettoyées');
    }

    // 4. Vérifier les colonnes de la table
    console.log('\n4️⃣ Vérification de la structure de la table...');
    const { data: columns, error: columnsError } = await supabase
      .from('project_event_attendees')
      .select('*')
      .limit(0);

    if (!columnsError) {
      console.log('   Colonnes disponibles:', Object.keys(columns || {}));
    }

  } catch (err) {
    console.error('❌ Erreur globale:', err);
  }
}

checkAndTest();