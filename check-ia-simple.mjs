import { createClient } from '@supabase/supabase-js';

// Utilisons la clé ANON officielle de CLAUDE.md
const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function checkIA() {
  console.log('🔍 Vérification de la ressource IA "Concepteur rédacteur IA"...\n');

  // 1. Chercher la ressource IA spécifique
  const { data: iaProfile, error: profileError } = await supabase
    .from('hr_profiles')
    .select('*')
    .ilike('name', '%Concepteur%rédacteur%IA%')
    .single();

  if (profileError || !iaProfile) {
    console.log('❌ Ressource "Concepteur rédacteur IA" non trouvée');
    console.log('Erreur:', profileError);

    // Chercher toutes les ressources IA
    const { data: allIA } = await supabase
      .from('hr_profiles')
      .select('name, is_ai')
      .eq('is_ai', true);

    if (allIA && allIA.length > 0) {
      console.log('\n📋 Ressources IA trouvées:');
      allIA.forEach(ia => console.log(`   - ${ia.name}`));
    }
    return;
  }

  console.log('✅ Ressource IA trouvée !');
  console.log(`   - Nom: ${iaProfile.name}`);
  console.log(`   - ID: ${iaProfile.id}`);
  console.log(`   - is_ai: ${iaProfile.is_ai}`);
  console.log(`   - Prix: ${iaProfile.base_price}€/min`);

  // 2. Vérifier le profil candidat
  const { data: candidateProfile, error: candidateError } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('id', iaProfile.id)
    .single();

  console.log('\n📋 Profil candidat:');
  if (candidateProfile) {
    console.log('   ✅ EXISTE - Configuration correcte !');
    console.log(`      - Nom: ${candidateProfile.first_name} ${candidateProfile.last_name}`);
    console.log(`      - Email: ${candidateProfile.email}`);
    console.log(`      - Status: ${candidateProfile.status}`);
    console.log(`      - Tarif jour: ${candidateProfile.daily_rate}€/jour`);
  } else {
    console.log('   ❌ MANQUANT - Il faut créer le profil candidat !');
    console.log('      Erreur:', candidateError);
  }

  // 3. Vérifier si elle apparaît dans les assignations
  const { data: assignments } = await supabase
    .from('hr_resource_assignments')
    .select('*, projects(title)')
    .eq('profile_id', iaProfile.id);

  console.log('\n📌 Assignations:');
  if (assignments && assignments.length > 0) {
    assignments.forEach(a => {
      const projectTitle = a.projects ? a.projects.title : 'N/A';
      console.log(`   - Projet: ${projectTitle}`);
      console.log(`     Status: ${a.booking_status}`);
      console.log(`     Candidate ID: ${a.candidate_id ? '✅ ' + a.candidate_id : '❌ NULL'}`);
    });
  } else {
    console.log('   Aucune assignation trouvée');
  }

  // Résumé
  console.log('\n' + '='.repeat(50));
  if (candidateProfile && iaProfile.is_ai) {
    console.log('✅ CONFIGURATION CORRECTE');
    console.log('La ressource IA devrait apparaître dans les messages !');
  } else {
    console.log('❌ CONFIGURATION INCORRECTE');
    if (!candidateProfile) {
      console.log('- Profil candidat manquant (doit avoir le même ID que hr_profile)');
    }
    if (!iaProfile.is_ai) {
      console.log('- Le flag is_ai n\'est pas activé');
    }
  }
}

checkIA().catch(console.error);