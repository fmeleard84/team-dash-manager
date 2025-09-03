import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRealtimeDetailed() {
  console.log('=== Test détaillé de la connexion Realtime ===\n');

  // 1. Test de connexion WebSocket de base
  console.log('1. Test connexion WebSocket...');
  
  const testChannel = supabase.channel('test-basic-connection');
  
  let connected = false;
  
  testChannel.subscribe((status) => {
    console.log(`   Status: ${status}`);
    if (status === 'SUBSCRIBED') {
      connected = true;
      console.log('   ✅ WebSocket connecté avec succès\n');
    }
  });

  // Attendre la connexion
  await new Promise(resolve => setTimeout(resolve, 3000));

  if (!connected) {
    console.log('   ❌ Impossible de se connecter au WebSocket\n');
  }

  supabase.removeChannel(testChannel);

  // 2. Test spécifique sur hr_resource_assignments
  console.log('2. Test sur hr_resource_assignments...');
  
  const assignmentsChannel = supabase
    .channel('test-assignments-detailed')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'hr_resource_assignments'
      },
      (payload) => {
        console.log('   📨 Event reçu:', payload);
      }
    );

  let assignmentsConnected = false;
  
  assignmentsChannel.subscribe((status, error) => {
    console.log(`   Status: ${status}`);
    if (error) {
      console.log(`   Erreur: ${JSON.stringify(error)}`);
    }
    if (status === 'SUBSCRIBED') {
      assignmentsConnected = true;
      console.log('   ✅ Subscription hr_resource_assignments réussie');
    } else if (status === 'CHANNEL_ERROR') {
      console.log('   ❌ Erreur de channel');
    } else if (status === 'TIMED_OUT') {
      console.log('   ❌ Timeout de connexion');
    } else if (status === 'CLOSED') {
      console.log('   ❌ Channel fermé');
    }
  });

  // Attendre un peu
  await new Promise(resolve => setTimeout(resolve, 5000));

  if (assignmentsConnected) {
    console.log('\n3. Test de mise à jour...');
    console.log('   Essayons de déclencher un event en mettant à jour une ligne...');
    
    // Récupérer un assignment existant
    const { data: assignments, error: fetchError } = await supabase
      .from('hr_resource_assignments')
      .select('id, updated_at')
      .limit(1);

    if (assignments && assignments.length > 0) {
      const testId = assignments[0].id;
      console.log(`   Mise à jour de l'assignment ${testId}...`);
      
      // Faire une petite mise à jour
      const { error: updateError } = await supabase
        .from('hr_resource_assignments')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', testId);

      if (updateError) {
        console.log(`   ❌ Erreur de mise à jour: ${updateError.message}`);
      } else {
        console.log('   ✅ Mise à jour effectuée, vérifiez si un event a été reçu ci-dessus');
      }
    } else {
      console.log('   ⚠️ Aucun assignment trouvé pour le test');
    }
  }

  // Attendre pour voir si des events arrivent
  await new Promise(resolve => setTimeout(resolve, 3000));

  supabase.removeChannel(assignmentsChannel);

  console.log('\n=== Fin du test ===');
  process.exit(0);
}

testRealtimeDetailed().catch(console.error);