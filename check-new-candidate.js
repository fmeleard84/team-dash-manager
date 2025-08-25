#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNewCandidate() {
  console.log('🔍 Vérification du nouveau candidat fmeleard+ressource_40@gmail.com\n');
  
  // 1. Chercher dans auth.users
  const email = 'fmeleard+ressource_40@gmail.com';
  
  // 2. Chercher dans profiles
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();
    
  if (profileError) {
    console.error('❌ Erreur profiles:', profileError);
  } else {
    console.log('📋 Table PROFILES:');
    console.log('  - ID:', profileData.id);
    console.log('  - Email:', profileData.email);
    console.log('  - Prénom:', profileData.first_name);
    console.log('  - Nom:', profileData.last_name);
    console.log('  - Téléphone:', profileData.phone || '❌ AUCUN');
    console.log('  - Rôle:', profileData.role);
    console.log('  - Société:', profileData.company_name);
    console.log('');
  }
  
  // 3. Chercher dans candidate_profiles
  if (profileData) {
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', profileData.id)
      .single();
      
    if (candidateError) {
      console.error('❌ Erreur candidate_profiles:', candidateError);
    } else {
      console.log('👤 Table CANDIDATE_PROFILES:');
      console.log('  - ID:', candidateData.id);
      console.log('  - User ID:', candidateData.user_id);
      console.log('  - Email:', candidateData.email);
      console.log('  - Prénom:', candidateData.first_name);
      console.log('  - Nom:', candidateData.last_name);
      console.log('  - Téléphone:', candidateData.phone || '❌ AUCUN');
      console.log('  - Profile ID (HR):', candidateData.profile_id || '❌ AUCUN');
      console.log('  - Taux journalier:', candidateData.daily_rate || '❌ AUCUN');
      console.log('  - Séniorité:', candidateData.seniority || '❌ AUCUN');
      console.log('  - Onboarding:', candidateData.onboarding_status);
      console.log('  - Étape onboarding:', candidateData.onboarding_current_step);
      console.log('');
      
      // Vérifier le profil HR associé
      if (candidateData.profile_id) {
        const { data: hrProfile, error: hrError } = await supabase
          .from('hr_profiles')
          .select(`
            id,
            name,
            hr_categories (
              id,
              name
            )
          `)
          .eq('id', candidateData.profile_id)
          .single();
          
        if (!hrError && hrProfile) {
          console.log('💼 Profil HR associé:');
          console.log('  - Poste:', hrProfile.name);
          console.log('  - Catégorie:', hrProfile.hr_categories?.name);
        }
      }
    }
  }
  
  console.log('\n📱 ANALYSE DU PROBLÈME:');
  console.log('-------------------');
  
  const candidateData = profileData ? await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('user_id', profileData.id)
    .then(r => r.data?.[0]) : null;
  
  if (!profileData?.phone && !candidateData?.phone) {
    console.log('⚠️  Le téléphone n\'a pas été sauvegardé lors de l\'inscription');
    console.log('   → Vérifier que le champ phone est bien envoyé dans le formulaire d\'inscription');
    console.log('   → Vérifier la fonction handle_new_user dans la base de données');
  } else if (profileData?.phone && !candidateData?.phone) {
    console.log('⚠️  Le téléphone est dans profiles mais pas dans candidate_profiles');
    console.log('   → La synchronisation profile->candidate ne fonctionne pas');
  } else if (!profileData?.phone && candidateData?.phone) {
    console.log('⚠️  Le téléphone est dans candidate_profiles mais pas dans profiles');
    console.log('   → La synchronisation candidate->profile ne fonctionne pas');
  }
  
  if (!candidateData?.profile_id) {
    console.log('⚠️  Pas de profil HR associé (profile_id est NULL)');
    console.log('   → C\'est normal si l\'onboarding n\'est pas terminé');
    console.log('   → Le poste/fonction ne peut pas s\'afficher sans profile_id');
  }
  
  if (!candidateData?.seniority) {
    console.log('⚠️  La séniorité n\'est pas définie');
    console.log('   → Elle doit être définie pendant l\'onboarding');
  }
}

checkNewCandidate().catch(console.error);