import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function checkIA() {
  console.log('🔍 Recherche de la ressource IA créée...\n');

  // 1. Chercher toutes les ressources avec is_ai = true
  const { data: iaProfiles, error } = await supabase
    .from('hr_profiles')
    .select('*')
    .eq('is_ai', true);

  if (error) {
    console.error('Erreur:', error);
    return;
  }

  if (!iaProfiles || iaProfiles.length === 0) {
    console.log('❌ Aucune ressource IA trouvée dans hr_profiles');
    return;
  }

  console.log(`✅ ${iaProfiles.length} ressource(s) IA trouvée(s) dans hr_profiles:\n`);

  for (const profile of iaProfiles) {
    console.log(`📋 Ressource: ${profile.name}`);
    console.log(`   - ID: ${profile.id}`);
    console.log(`   - is_ai: ${profile.is_ai}`);
    console.log(`   - Prix: ${profile.base_price}€/min`);
    console.log(`   - prompt_id: ${profile.prompt_id || 'Non défini'}`);

    // 2. Vérifier si un profil candidat existe
    const { data: candidateProfile } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', profile.id)
      .single();

    if (candidateProfile) {
      console.log(`   ✅ Profil candidat existe:`);
      console.log(`      - Nom: ${candidateProfile.first_name} ${candidateProfile.last_name}`);
      console.log(`      - Email: ${candidateProfile.email}`);
      console.log(`      - Status: ${candidateProfile.status}`);
      console.log(`      - Daily rate: ${candidateProfile.daily_rate}€/jour`);
    } else {
      console.log(`   ❌ PAS de profil candidat (PROBLÈME!)`);
    }

    // 3. Vérifier les assignations
    const { data: assignments } = await supabase
      .from('hr_resource_assignments')
      .select('*, projects(title)')
      .eq('profile_id', profile.id);

    if (assignments && assignments.length > 0) {
      console.log(`   📌 Assignations:`);
      for (const assign of assignments) {
        const projectTitle = assign.projects ? assign.projects.title : 'N/A';
        console.log(`      - Projet: ${projectTitle}`);
        console.log(`        Status: ${assign.booking_status}`);
        console.log(`        Candidate ID: ${assign.candidate_id || 'NULL'}`);
      }
    } else {
      console.log(`   📌 Aucune assignation`);
    }
    console.log('');
  }
}

checkIA().catch(console.error);
