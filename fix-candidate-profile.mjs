import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.gYJsJbdHXgFRpRvYXCJNqhQbyXzRoT5U4TXdHQ2hOX0'
);

const candidateId = '24d7b412-ace1-42ca-8332-a6c426f5c98a';

async function fixCandidateProfile() {
  console.log('🔧 Création des profils pour le candidat', candidateId);

  // 1. Obtenir les infos depuis auth.users
  const { data: { user } } = await supabase.auth.admin.getUserById(candidateId);

  if (!user) {
    console.error('❌ Utilisateur non trouvé dans auth.users');
    process.exit(1);
  }

  console.log('\n📧 Email trouvé:', user.email);
  console.log('📝 Metadata:', user.user_metadata);

  // 2. Créer le profil général
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: candidateId,
      email: user.email,
      role: 'candidate',
      first_name: user.user_metadata?.first_name || user.user_metadata?.firstName || '',
      last_name: user.user_metadata?.last_name || user.user_metadata?.lastName || '',
      phone: user.user_metadata?.phone || ''
    });

  if (profileError && profileError.code !== '23505') {
    console.error('❌ Erreur création profil:', profileError.message);
  } else if (!profileError) {
    console.log('✅ Profil général créé');
  } else {
    console.log('ℹ️  Profil général déjà existant');
  }

  // 3. Créer le profil candidat
  const { error: candidateError } = await supabase
    .from('candidate_profiles')
    .insert({
      id: candidateId,
      email: user.email || '',
      first_name: user.user_metadata?.first_name || user.user_metadata?.firstName || '',
      last_name: user.user_metadata?.last_name || user.user_metadata?.lastName || '',
      phone: user.user_metadata?.phone || '',
      status: 'disponible',
      qualification_status: 'pending',
      seniority: 'junior',
      profile_id: null,
      daily_rate: 0,
      password_hash: '',
      is_email_verified: user.email_confirmed_at !== null
    });

  if (candidateError && candidateError.code !== '23505') {
    console.error('❌ Erreur création profil candidat:', candidateError.message);
  } else if (!candidateError) {
    console.log('✅ Profil candidat créé');
  } else {
    console.log('ℹ️  Profil candidat déjà existant');
  }

  // 4. Vérifier
  const { data: check } = await supabase
    .from('candidate_profiles')
    .select('id, email, status, qualification_status')
    .eq('id', candidateId)
    .single();

  if (check) {
    console.log('\n✅ SUCCÈS - Profil candidat vérifié:');
    console.log('   - ID:', check.id);
    console.log('   - Email:', check.email);
    console.log('   - Status:', check.status);
    console.log('   - Qualification:', check.qualification_status);
    console.log('\n👉 Le candidat peut maintenant se connecter et utiliser l\'application');
  } else {
    console.log('\n❌ Le profil n\'a pas pu être créé');
  }

  // 5. Vérifier pourquoi le trigger ne fonctionne pas
  console.log('\n🔍 Vérification du trigger...');
  const { data: triggerCheck, error: triggerError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        t.tgname AS trigger_name,
        t.tgenabled AS enabled,
        p.proname AS function_name
      FROM pg_trigger t
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE t.tgname = 'on_auth_user_created';
    `
  });

  if (triggerCheck?.rows?.length > 0) {
    const trigger = triggerCheck.rows[0];
    console.log('✅ Trigger trouvé:');
    console.log('   - Nom:', trigger.trigger_name);
    console.log('   - Actif:', trigger.enabled === 'O' ? 'OUI' : 'NON');
    console.log('   - Fonction:', trigger.function_name);
  } else {
    console.log('❌ TRIGGER MANQUANT - C\'est le problème principal !');
    console.log('   Le trigger doit être recréé pour que les futurs candidats aient leur profil automatiquement');
  }

  process.exit(0);
}

fixCandidateProfile();