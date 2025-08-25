#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCandidateDisplay() {
  console.log('🔍 Debug complet de l\'affichage candidat\n');
  
  const email = 'fmeleard+ressource_40@gmail.com';
  
  // 1. Récupérer l'ID candidat
  console.log('📌 Étape 1: Récupération de l\'ID candidat');
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();
    
  console.log('  User ID (profiles):', profile?.id);
  
  // 2. Récupérer les données candidate_profiles PAR L'ID CANDIDAT (pas user_id)
  console.log('\n📌 Étape 2: Données depuis candidate_profiles');
  
  // D'abord récupérer l'ID du candidat
  const { data: candidateBasic } = await supabase
    .from('candidate_profiles')
    .select('id, user_id')
    .eq('user_id', profile?.id)
    .single();
    
  console.log('  Candidate ID:', candidateBasic?.id);
  console.log('  User ID dans candidate_profiles:', candidateBasic?.user_id);
  
  // 3. Requête EXACTE comme dans CandidateSettings.tsx
  console.log('\n📌 Étape 3: Requête comme dans CandidateSettings.tsx');
  
  if (candidateBasic?.id) {
    const candidateId = candidateBasic.id; // eb38a9e3-9b7a-4157-842d-70c0a9178a3b
    
    const { data: candidateData, error } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', candidateId)
      .single();
      
    if (error) {
      console.error('  ❌ Erreur:', error);
    } else {
      console.log('  ✅ Données récupérées:');
      console.log('    - Téléphone:', candidateData.phone || '❌ AUCUN');
      console.log('    - Séniorité:', candidateData.seniority || '❌ AUCUN');
      console.log('    - Taux journalier:', candidateData.daily_rate || '❌ AUCUN');
      console.log('    - Profile ID (HR):', candidateData.profile_id || '❌ AUCUN');
    }
    
    // 4. Récupérer le profil HR séparément
    console.log('\n📌 Étape 4: Récupération du profil HR');
    
    if (candidateData?.profile_id) {
      const { data: profileData, error: profileError } = await supabase
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
        
      if (profileError) {
        console.error('  ❌ Erreur HR profile:', profileError);
      } else {
        console.log('  ✅ Profil HR trouvé:');
        console.log('    - Poste:', profileData.name);
        console.log('    - Catégorie:', profileData.hr_categories?.name);
        console.log('    → Affichage attendu: "' + profileData.hr_categories?.name + ' - ' + profileData.name + '"');
      }
    }
    
    // 5. Mise à jour finale du téléphone si nécessaire
    if (!candidateData?.phone && profile?.id) {
      console.log('\n📌 Étape 5: Correction du téléphone manquant');
      
      // Récupérer le téléphone depuis profiles
      const { data: profileWithPhone } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', profile.id)
        .single();
        
      if (profileWithPhone?.phone) {
        const { error: updateError } = await supabase
          .from('candidate_profiles')
          .update({ phone: profileWithPhone.phone })
          .eq('id', candidateId);
          
        if (updateError) {
          console.error('  ❌ Erreur de mise à jour:', updateError);
        } else {
          console.log('  ✅ Téléphone mis à jour:', profileWithPhone.phone);
        }
      }
    }
  }
  
  console.log('\n💡 SOLUTION:');
  console.log('------------');
  console.log('Le composant CandidateSettings utilise candidateId (pas user_id)');
  console.log('Les données sont bien présentes en base');
  console.log('Il faut s\'assurer que le candidateId est passé correctement');
  console.log('depuis CandidateDashboard vers CandidateSettings');
}

debugCandidateDisplay().catch(console.error);