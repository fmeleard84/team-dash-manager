import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testOnboardingSystem() {
  console.log('🔍 Test du système d\'onboarding...');
  
  try {
    // Test 1: Recherche du profil candidat spécifique
    console.log('\n👤 Test 1: Recherche du profil fmeleard+ressource_5@gmail.com...');
    const { data: specificProfile, error: specificError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('email', 'fmeleard+ressource_5@gmail.com')
      .single();
    
    if (specificError) {
      console.error('❌ Erreur profil spécifique:', specificError);
      
      // Test structure de la table
      console.log('\n📋 Test 1b: Structure de candidate_profiles...');
      const { data: allProfiles, error: allError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .limit(1);
        
      if (allError) {
        console.error('❌ Erreur accès table:', allError);
      } else {
        console.log('✅ Structure table candidate_profiles:', Object.keys(allProfiles[0] || {}));
      }
    } else {
      console.log('✅ Profil trouvé:', specificProfile);
    }

    // Test 1c: Vérifier si l'utilisateur existe dans profiles
    console.log('\n🔍 Test 1c: Recherche dans la table profiles...');
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'fmeleard+ressource_5@gmail.com')
      .single();
    
    if (userError) {
      console.error('❌ Utilisateur pas trouvé dans profiles:', userError);
    } else {
      console.log('✅ Utilisateur trouvé dans profiles:', userProfile);
    }

    // Test 1d: Essayer de créer un profil candidat simple
    console.log('\n🔧 Test 1d: Création de profil candidat...');
    try {
      const { data: newCandidate, error: createError } = await supabase
        .from('candidate_profiles')
        .insert({
          email: 'fmeleard+ressource_5@gmail.com',
          first_name: 'Meleard R',
          last_name: 'Francis R',
          qualification_status: 'pending'
          // On n'inclut pas password_hash pour voir l'erreur exacte
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Erreur création profil candidat:', createError);
      } else {
        console.log('✅ Profil candidat créé:', newCandidate);
      }
    } catch (err) {
      console.error('💥 Exception création:', err);
    }

    // Test 2: Accès aux profils métiers HR
    console.log('\n👔 Test 2: Accès aux hr_profiles...');
    const { data: hrProfiles, error: hrProfilesError } = await supabase
      .from('hr_profiles')
      .select('*')
      .limit(5);
    
    if (hrProfilesError) {
      console.error('❌ Erreur hr_profiles:', hrProfilesError);
    } else {
      console.log('✅ Accès hr_profiles OK');
      console.log('📊 Profils métiers disponibles:', hrProfiles);
    }

    // Test 3: Accès aux expertises
    console.log('\n🎯 Test 3: Accès aux hr_expertises...');
    const { data: expertises, error: expertiseError } = await supabase
      .from('hr_expertises')
      .select('id, name, category_id')
      .limit(10);
    
    if (expertiseError) {
      console.error('❌ Erreur expertises:', expertiseError);
    } else {
      console.log('✅ Accès hr_expertises OK');
      console.log('📊 Exemples d\'expertises:', expertises?.map(e => e.name));
    }

    // Test 4: Accès aux langues
    console.log('\n🌍 Test 4: Accès aux hr_languages...');
    const { data: languages, error: langError } = await supabase
      .from('hr_languages')
      .select('id, name, code')
      .limit(5);
    
    if (langError) {
      console.error('❌ Erreur languages:', langError);
    } else {
      console.log('✅ Accès hr_languages OK');
      console.log('📊 Langues disponibles:', languages?.map(l => `${l.name} (${l.code})`));
    }

    // Test 5: Projets et bookings pour le candidat
    console.log('\n📁 Test 5: Vérification complète des projets et bookings...');
    
    // 5a. Tous les projets
    const { data: allProjects, error: allProjectsError } = await supabase
      .from('projects')
      .select('id, title, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (allProjectsError) {
      console.error('❌ Erreur tous projets:', allProjectsError);
    } else {
      console.log('✅ Projets existants:', allProjects?.map(p => `${p.title} (${p.status})`));
    }
    
    // 5b. Recherche du profil candidat
    const { data: candidateProfile } = await supabase
      .from('candidate_profiles')
      .select('id, email, profile_id')
      .eq('email', 'fmeleard+ressource_5@gmail.com')
      .single();
      
    if (candidateProfile) {
      console.log('👤 Profil candidat trouvé:', candidateProfile);
      
      // 5c. Vérifier les bookings pour ce candidat
      const { data: bookings, error: bookingsError } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          project_id,
          booking_status,
          projects (
            id,
            title,
            status
          )
        `)
        .eq('candidate_id', candidateProfile.id);
        
      if (bookingsError) {
        console.error('❌ Erreur bookings:', bookingsError);
      } else {
        console.log('📅 Bookings du candidat:', bookings);
      }
      
      // 5d. Vérifier les assignments sans candidate_id
      const { data: availableAssignments } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          profile_id,
          candidate_id,
          booking_status,
          projects (
            title,
            status
          )
        `)
        .is('candidate_id', null)
        .eq('booking_status', 'pending')
        .limit(5);
        
      console.log('🔍 Assignments disponibles:', availableAssignments);
    } else {
      console.log('❌ Pas de profil candidat trouvé');
    }
    
    console.log('\n🎉 Tests terminés ! Le système d\'onboarding semble fonctionnel.');
    
  } catch (err) {
    console.error('💥 Erreur:', err);
  }
}

testOnboardingSystem();