#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCandidatePhone() {
  console.log('🔧 Correction du téléphone pour le candidat...\n');
  
  const email = 'fmeleard+ressource_40@gmail.com';
  
  // 1. Synchroniser le téléphone de profiles vers candidate_profiles
  console.log('📱 Synchronisation du téléphone...');
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, phone')
    .eq('email', email)
    .single();
    
  if (profile && profile.phone) {
    const { error } = await supabase
      .from('candidate_profiles')
      .update({ phone: profile.phone })
      .eq('user_id', profile.id);
      
    if (error) {
      console.error('❌ Erreur de mise à jour:', error);
    } else {
      console.log('✅ Téléphone synchronisé:', profile.phone);
    }
  }
  
  // 2. Vérifier pourquoi le poste et la séniorité ne s'affichent pas
  console.log('\n🔍 Vérification de l\'affichage...');
  
  const { data: candidateData } = await supabase
    .from('candidate_profiles')
    .select(`
      *,
      hr_profiles!candidate_profiles_profile_id_fkey (
        id,
        name,
        hr_categories (
          id,
          name
        )
      )
    `)
    .eq('user_id', profile.id)
    .single();
    
  console.log('\n📊 Données récupérées pour l\'affichage:');
  if (candidateData) {
    console.log('  - Téléphone:', candidateData.phone);
    console.log('  - Séniorité:', candidateData.seniority);
    console.log('  - Taux journalier:', candidateData.daily_rate);
    console.log('  - Profile HR:', candidateData.hr_profiles);
  } else {
    console.log('  ❌ Aucune donnée candidate trouvée');
  }
  
  if (candidateData?.hr_profiles) {
    console.log('    → Poste:', candidateData.hr_profiles.name);
    console.log('    → Catégorie:', candidateData.hr_profiles.hr_categories?.name);
  }
  
  console.log('\n💡 DIAGNOSTIC:');
  console.log('-------------');
  
  if (!candidateData?.phone) {
    console.log('⚠️  Le téléphone n\'est toujours pas dans candidate_profiles');
  } else {
    console.log('✅ Le téléphone est maintenant dans candidate_profiles');
  }
  
  if (candidateData?.hr_profiles) {
    console.log('✅ Le poste devrait s\'afficher correctement');
    console.log('   Format attendu: "' + candidateData.hr_profiles.hr_categories?.name + ' - ' + candidateData.hr_profiles.name + '"');
  } else {
    console.log('❌ Le profil HR n\'est pas chargé correctement');
    console.log('   → Vérifier la jointure dans CandidateSettings.tsx');
  }
  
  if (candidateData?.seniority) {
    console.log('✅ La séniorité devrait s\'afficher: "' + candidateData.seniority + '"');
  }
  
  if (!candidateData?.daily_rate) {
    console.log('ℹ️  Le taux journalier n\'est pas défini (normal si pas encore renseigné)');
  }
}

fixCandidatePhone().catch(console.error);