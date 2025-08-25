#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCandidate41() {
  console.log('🔍 Vérification du candidat fmeleard+ressource41@gmail.com\n');
  
  const email = 'fmeleard+ressource41@gmail.com';
  
  // 1. Vérifier dans profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email);
    
  if (profileError) {
    console.error('❌ Erreur profiles:', profileError.message);
    return;
  }
  
  if (!profiles || profiles.length === 0) {
    console.log('❌ Aucun profil trouvé avec cet email');
    console.log('   Le candidat n\'existe peut-être pas encore');
    return;
  }
  
  if (profiles.length > 1) {
    console.log('⚠️  Plusieurs profils trouvés avec cet email:', profiles.length);
    console.log('   Utilisation du plus récent');
  }
  
  const profile = profiles[profiles.length - 1];
  
  console.log('📋 Table PROFILES:');
  console.log('  - ID:', profile.id);
  console.log('  - Email:', profile.email);
  console.log('  - Prénom:', profile.first_name);
  console.log('  - Nom:', profile.last_name);
  console.log('  - Téléphone:', profile.phone || '❌ AUCUN');
  console.log('  - Rôle:', profile.role);
  console.log('');
  
  // 2. Vérifier dans candidate_profiles
  const { data: candidate, error: candidateError } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('user_id', profile.id)
    .single();
    
  if (candidateError) {
    console.error('❌ Erreur candidate_profiles:', candidateError.message);
    return;
  }
  
  console.log('👤 Table CANDIDATE_PROFILES:');
  console.log('  - ID:', candidate.id);
  console.log('  - User ID:', candidate.user_id);
  console.log('  - Email:', candidate.email);
  console.log('  - Prénom:', candidate.first_name);
  console.log('  - Nom:', candidate.last_name);
  console.log('  - Téléphone:', candidate.phone || '❌ AUCUN');
  console.log('  - Profile ID (HR):', candidate.profile_id || '❌ AUCUN');
  console.log('  - Séniorité:', candidate.seniority || '❌ AUCUN');
  console.log('  - Taux journalier:', candidate.daily_rate || '❌ AUCUN');
  console.log('  - Onboarding status:', candidate.onboarding_status);
  console.log('  - Onboarding step:', candidate.onboarding_current_step);
  console.log('  - Qualification status:', candidate.qualification_status);
  console.log('  - Is validated:', candidate.is_validated);
  console.log('  - Is available:', candidate.is_available);
  console.log('');
  
  // 3. Vérifier le profil HR associé
  if (candidate.profile_id) {
    const { data: hrProfile } = await supabase
      .from('hr_profiles')
      .select(`
        name,
        hr_categories (
          name
        )
      `)
      .eq('id', candidate.profile_id)
      .single();
      
    if (hrProfile) {
      console.log('💼 Profil HR:');
      console.log('  - Poste:', hrProfile.name);
      console.log('  - Catégorie:', hrProfile.hr_categories?.name);
      console.log('');
    }
  }
  
  // 4. Vérifier les expertises
  const { data: expertises } = await supabase
    .from('candidate_expertises')
    .select(`
      hr_expertises (
        name
      )
    `)
    .eq('candidate_id', candidate.id);
    
  if (expertises && expertises.length > 0) {
    console.log('🎯 Expertises:');
    expertises.forEach(e => {
      console.log('  -', e.hr_expertises?.name);
    });
    console.log('');
  }
  
  // 5. Vérifier les langues
  const { data: languages } = await supabase
    .from('candidate_languages')
    .select(`
      hr_languages (
        name
      )
    `)
    .eq('candidate_id', candidate.id);
    
  if (languages && languages.length > 0) {
    console.log('🌍 Langues:');
    languages.forEach(l => {
      console.log('  -', l.hr_languages?.name);
    });
    console.log('');
  }
  
  // 6. Diagnostic
  console.log('\n📊 DIAGNOSTIC:');
  console.log('-------------------');
  
  if (!candidate.onboarding_status || candidate.onboarding_status === 'pending') {
    console.log('⚠️  Onboarding status est "pending" ou null');
    console.log('   → L\'onboarding n\'est peut-être pas marqué comme terminé');
  }
  
  if (candidate.onboarding_current_step && candidate.onboarding_current_step < 999) {
    console.log('⚠️  L\'étape d\'onboarding est:', candidate.onboarding_current_step);
    console.log('   → Devrait être 999 pour un onboarding terminé');
  }
  
  if (candidate.qualification_status !== 'pending') {
    console.log('⚠️  Le statut de qualification n\'est pas "pending":', candidate.qualification_status);
  }
  
  if (candidate.is_validated === true) {
    console.log('⚠️  Le candidat est déjà marqué comme validé');
    console.log('   → Pas besoin de passer le test');
  }
  
  if (candidate.is_available === true) {
    console.log('⚠️  Le candidat est déjà marqué comme disponible');
    console.log('   → Devrait être false jusqu\'à validation');
  }
  
  console.log('\n💡 SOLUTION:');
  console.log('------------');
  console.log('Le rechargement de la page peut venir de:');
  console.log('1. L\'onboarding qui ne se termine pas correctement');
  console.log('2. Une erreur dans le hook useCandidateOnboarding');
  console.log('3. Le composant CandidateOnboarding qui appelle onComplete incorrectement');
}

checkCandidate41().catch(console.error);