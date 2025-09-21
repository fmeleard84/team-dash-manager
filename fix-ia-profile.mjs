import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function fixIAProfile() {
  console.log('🔧 Correction du profil IA manquant...\n');

  // 1. Trouver l'IA existante
  const { data: iaProfiles } = await supabase
    .from('hr_profiles')
    .select('*')
    .eq('is_ai', true);

  if (!iaProfiles || iaProfiles.length === 0) {
    console.log('❌ Aucune ressource IA trouvée');
    return;
  }

  for (const iaProfile of iaProfiles) {
    console.log(`\n🤖 Traitement de: ${iaProfile.name}`);
    console.log(`   ID: ${iaProfile.id}`);

    // 2. Vérifier si le profil principal existe
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', iaProfile.id)
      .single();

    if (existingProfile) {
      console.log('   ✅ Profil principal existe déjà');
    } else {
      console.log('   ❌ Profil principal manquant - création...');

      // Récupérer les infos du candidate_profile
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', iaProfile.id)
        .single();

      // Créer le profil principal
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: iaProfile.id,
          email: candidateProfile?.email || `ia_${iaProfile.id}@ia.team`,
          first_name: candidateProfile?.first_name || 'IA',
          last_name: candidateProfile?.last_name || iaProfile.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('   ❌ Erreur création profil:', profileError.message);
      } else {
        console.log('   ✅ Profil principal créé avec succès !');
      }
    }
  }

  console.log('\n✅ Correction terminée !');
}

fixIAProfile().catch(console.error);