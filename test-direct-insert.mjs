import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.oYNLLJEW8Qv4zcEPUb-wuQR3SZ2pTKDR0M3pchP3fII';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testInsert() {
  console.log('=== TEST DIRECT INSERT (SERVICE ROLE) ===\n');
  
  // 1. Créer un événement de test
  const { data: event, error: eventError } = await supabase
    .from('project_events')
    .insert({
      project_id: 'b7c02509-0b70-4e9c-bd96-160911a00944',
      title: 'Test Direct Insert Service',
      start_at: new Date().toISOString(),
      created_by: '6352b49b-6bb2-40f0-a9fd-e83ea430be32'
    })
    .select()
    .single();

  if (eventError) {
    console.error('Erreur création événement:', eventError);
    return;
  }

  console.log('Événement créé:', event.id);

  // 2. Tester l'insertion d'un participant SANS .select()
  const attendee = {
    event_id: event.id,
    user_id: '6352b49b-6bb2-40f0-a9fd-e83ea430be32',
    role: 'client',
    required: true,
    response_status: 'pending'
  };

  console.log('Tentative insertion participant (sans .select()):', attendee);

  const { error } = await supabase
    .from('project_event_attendees')
    .insert([attendee]);

  if (error) {
    console.error('❌ Erreur insertion:', error);
  } else {
    console.log('✅ Insertion réussie!');
  }

  // 3. Tester une deuxième insertion (devrait échouer avec duplicate key)
  console.log('\nTest doublon (devrait échouer)...');
  const { error: error2 } = await supabase
    .from('project_event_attendees')
    .insert([attendee]);

  if (error2) {
    console.log('✅ Doublon correctement rejeté:', error2.code);
  } else {
    console.log('❌ Le doublon n\'a pas été rejeté!');
  }

  // Nettoyer
  await supabase.from('project_event_attendees').delete().eq('event_id', event.id);
  await supabase.from('project_events').delete().eq('id', event.id);
}

testInsert();
