import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.gYJsJbdHXgFRpRvYXCJNqhQbyXzRoT5U4TXdHQ2hOX0'
);

console.log('🔍 Vérification des derniers utilisateurs créés...\n');

// Récupérer les derniers utilisateurs
const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
  page: 1,
  perPage: 5
});

if (usersError) {
  console.error('Erreur:', usersError);
  process.exit(1);
}

console.log(`📊 ${users.users.length} derniers utilisateurs:\n`);

for (const user of users.users) {
  const role = user.user_metadata?.role || 'non défini';
  console.log(`👤 ${user.email}`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Role: ${role}`);
  console.log(`   Créé: ${new Date(user.created_at).toLocaleString()}`);
  console.log(`   Email confirmé: ${user.email_confirmed_at ? 'Oui' : 'Non'}`);
  
  // Vérifier dans profiles
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  console.log(`   ✅ Profil général: ${profile ? 'Créé' : '❌ MANQUANT'}`);
  
  // Si client, vérifier client_profiles
  if (role === 'client') {
    const { data: clientProfile } = await supabaseAdmin
      .from('client_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    console.log(`   ✅ Profil client: ${clientProfile ? 'Créé' : '❌ MANQUANT'}`);
    
    if (!clientProfile) {
      console.log('   ⚠️  Le webhook n\'a pas créé le profil client!');
    }
  }
  
  // Si candidat, vérifier candidate_profiles
  if (role === 'candidate') {
    const { data: candidateProfile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    console.log(`   ✅ Profil candidat: ${candidateProfile ? 'Créé' : '❌ MANQUANT'}`);
  }
  
  console.log('');
}

console.log('💡 Note: Si les profils clients sont manquants, le webhook n\'a pas été déclenché.');
console.log('   Vérifiez les logs de la fonction handle-new-user-simple dans le dashboard Supabase.');

process.exit(0);