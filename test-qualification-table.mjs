import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
);

console.log('🔧 Test de réparation de la table candidate_qualification_results...');

try {
  // Invoquer la fonction de réparation
  const { data, error } = await supabase.functions.invoke('fix-qualification-results-table', {
    method: 'POST'
  });

  if (error) {
    console.error('❌ Erreur lors de l\'appel à la fonction:', error);
  } else {
    console.log('✅ Réponse de la fonction:', data);
  }

  // Tester l'accès à la table
  console.log('\n🧪 Test d\'accès à la table...');
  const { data: tableData, error: tableError } = await supabase
    .from('candidate_qualification_results')
    .select('id')
    .limit(1);

  if (tableError) {
    console.error('❌ Erreur d\'accès à la table:', tableError);
  } else {
    console.log('✅ Table accessible:', tableData);
  }

} catch (error) {
  console.error('❌ Erreur générale:', error);
}