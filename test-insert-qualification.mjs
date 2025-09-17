import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
);

console.log('🧪 Test d\'insertion dans candidate_qualification_results...');

try {
  // D'abord, authentifions un utilisateur test si possible
  console.log('🔐 Tentative d\'authentification...');

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword'
  });

  if (authError) {
    console.log('❌ Pas d\'auth possible (normal en test):', authError.message);
  } else {
    console.log('✅ Authentifié:', authData.user?.email);
  }

  // Tenter d'insérer un résultat de test
  const testResult = {
    candidate_id: '123e4567-e89b-12d3-a456-426614174000', // UUID test
    test_id: 'test_realtime_' + Date.now(),
    score: 85,
    max_score: 100,
    status: 'passed',
    test_date: new Date().toISOString()
  };

  console.log('📝 Tentative d\'insertion:', testResult);

  const { data, error } = await supabase
    .from('candidate_qualification_results')
    .insert(testResult)
    .select()
    .single();

  if (error) {
    console.error('❌ Erreur d\'insertion:', error);
    console.error('Code erreur:', error.code);
    console.error('Détails:', error.details);
    console.error('Message:', error.message);

    // Essayer avec une structure différente
    console.log('\n🔄 Tentative avec structure simplifiée...');

    const simpleResult = {
      candidate_id: '123e4567-e89b-12d3-a456-426614174000',
      test_id: 'simple_test',
      score: 75,
      status: 'passed'
    };

    const { data: data2, error: error2 } = await supabase
      .from('candidate_qualification_results')
      .insert(simpleResult)
      .select()
      .single();

    if (error2) {
      console.error('❌ Erreur avec structure simplifiée:', error2);
    } else {
      console.log('✅ Insertion simplifiée réussie:', data2);

      // Nettoyer le test
      await supabase
        .from('candidate_qualification_results')
        .delete()
        .eq('id', data2.id);
      console.log('🧹 Test nettoyé');
    }
  } else {
    console.log('✅ Insertion réussie:', data);

    // Nettoyer le test
    await supabase
      .from('candidate_qualification_results')
      .delete()
      .eq('id', data.id);
    console.log('🧹 Test nettoyé');
  }

} catch (error) {
  console.error('❌ Erreur générale:', error);
}