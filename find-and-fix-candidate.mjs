import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.gYJsJbdHXgFRpRvYXCJNqhQbyXzRoT5U4TXdHQ2hOX0'
);

async function findAndFixCandidate() {
  console.log('🔍 Recherche de tous les utilisateurs récents...\n');

  // Lister tous les utilisateurs
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Erreur:', error);
    return;
  }

  // Filtrer les utilisateurs récents (créés dans les dernières 24h)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const recentUsers = users.filter(u => {
    const created = new Date(u.created_at);
    return created > yesterday;
  });

  console.log(`📊 ${recentUsers.length} utilisateurs créés dans les dernières 24h:\n`);
  
  for (const user of recentUsers) {
    console.log(`\n👤 Utilisateur: ${user.email}`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Créé: ${user.created_at}`);
    console.log(`   - Email confirmé: ${user.email_confirmed_at ? 'OUI' : 'NON'}`);
    console.log(`   - Role: ${user.user_metadata?.role || 'non défini'}`);
    
    // Vérifier s'il a un profil candidat
    const { data: candidateProfile } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('id', user.id)
      .single();
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();
    
    console.log(`   - Profil général: ${profile ? '✅' : '❌'}`);
    console.log(`   - Profil candidat: ${candidateProfile ? '✅' : '❌'}`);
    
    // Si c'est un candidat sans profil, le créer
    if ((user.user_metadata?.role === 'candidate' || !user.user_metadata?.role) && !candidateProfile) {
      console.log(`\n   🔧 Création des profils manquants pour ${user.email}...`);
      
      // Créer le profil général
      if (!profile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            role: user.user_metadata?.role || 'candidate',
            first_name: user.user_metadata?.first_name || user.user_metadata?.firstName || '',
            last_name: user.user_metadata?.last_name || user.user_metadata?.lastName || '',
            phone: user.user_metadata?.phone || ''
          });
        
        if (!profileError) {
          console.log('   ✅ Profil général créé');
        } else if (profileError.code !== '23505') {
          console.log('   ❌ Erreur profil général:', profileError.message);
        }
      }
      
      // Créer le profil candidat
      const { error: candidateError } = await supabase
        .from('candidate_profiles')
        .insert({
          id: user.id,
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
      
      if (!candidateError) {
        console.log('   ✅ Profil candidat créé');
      } else if (candidateError.code !== '23505') {
        console.log('   ❌ Erreur profil candidat:', candidateError.message);
      }
    }
  }
  
  // Vérifier le trigger
  console.log('\n\n🔍 VÉRIFICATION DU TRIGGER DE CRÉATION AUTOMATIQUE:\n');
  const { data: triggerCheck } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        t.tgname AS trigger_name,
        t.tgenabled AS enabled,
        n.nspname AS schema_name,
        c.relname AS table_name
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE t.tgname LIKE '%user%' OR t.tgname LIKE '%auth%'
      ORDER BY t.tgname;
    `
  });
  
  if (triggerCheck?.rows?.length > 0) {
    console.log('Triggers trouvés:');
    triggerCheck.rows.forEach(t => {
      console.log(`   - ${t.trigger_name} sur ${t.schema_name}.${t.table_name} (${t.enabled === 'O' ? 'ACTIF' : 'INACTIF'})`);
    });
  } else {
    console.log('❌ AUCUN TRIGGER TROUVÉ pour la création automatique des profils !');
  }

  // Rechercher spécifiquement le trigger on_auth_user_created
  const { data: specificTrigger } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT COUNT(*) as count 
      FROM pg_trigger 
      WHERE tgname = 'on_auth_user_created';
    `
  });

  if (specificTrigger?.rows?.[0]?.count === '0') {
    console.log('\n⚠️  Le trigger "on_auth_user_created" n\'existe pas !');
    console.log('   C\'est pour ça que les profils ne sont pas créés automatiquement.');
    console.log('\n👉 Il faut recréer ce trigger pour que les futurs candidats aient leur profil automatiquement.');
  }

  process.exit(0);
}

findAndFixCandidate();