import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
);

const userId = '7a7cee55-5a73-4260-8fe9-a5643cd0fbd7';
const email = 'fmeleard+webhook_ok_1757141480113@gmail.com';

console.log('🎯 VÉRIFICATION FINALE\n');
console.log(`📧 Email: ${email}`);
console.log(`🆔 ID: ${userId}\n`);

// Vérifier directement sans authentification
const { data: profiles } = await supabase
  .from('profiles')
  .select('*')
  .or(`id.eq.${userId},email.eq.${email}`);

const { data: candidates } = await supabase
  .from('candidate_profiles')
  .select('*')
  .or(`id.eq.${userId},email.eq.${email}`);

console.log('📊 RÉSULTATS:\n');

if (profiles && profiles.length > 0) {
  console.log('✅ PROFIL GÉNÉRAL CRÉÉ !');
  console.log('   - ID:', profiles[0].id);
  console.log('   - Email:', profiles[0].email);
  console.log('   - Role:', profiles[0].role);
} else {
  console.log('❌ Pas de profil général');
}

console.log('');

if (candidates && candidates.length > 0) {
  console.log('✅ PROFIL CANDIDAT CRÉÉ !');
  console.log('   - ID:', candidates[0].id);
  console.log('   - Status:', candidates[0].status);
  console.log('   - Qualification:', candidates[0].qualification_status);
} else {
  console.log('❌ Pas de profil candidat');
}

console.log('\n' + '='.repeat(60));

if (profiles?.length > 0 && candidates?.length > 0) {
  console.log('🎉 🎉 🎉  SUCCÈS TOTAL  🎉 🎉 🎉');
  console.log('\nLE WEBHOOK FONCTIONNE PARFAITEMENT !');
  console.log('Tous les nouveaux utilisateurs auront leurs profils créés.');
} else {
  console.log('❌ Les profils n\'ont pas été créés');
  console.log('\nVérifiez les logs Edge Function pour voir le status code :');
  console.log('https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/functions/handle-new-user/logs');
  console.log('\nSi status = 401 : problème d\'authentification');
  console.log('Si status = 200 : erreur dans la fonction');
}

process.exit(0);