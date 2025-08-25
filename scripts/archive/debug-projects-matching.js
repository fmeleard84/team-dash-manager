import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugProjectMatching() {
  console.log('🔍 Debug matching projets pour directeur marketing...');
  
  try {
    // 1. Vérifier le profil candidat mis à jour
    console.log('\n👤 Step 1: Profil candidat après onboarding...');
    const { data: candidate, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('email', 'fmeleard+ressource_5@gmail.com')
      .single();
    
    // Récupérer le profil métier séparément
    let profile = null;
    if (candidate && candidate.profile_id) {
      const { data: profileData, error: profileError } = await supabase
        .from('hr_profiles')
        .select(`
          id,
          name,
          category_id,
          hr_categories (
            name
          )
        `)
        .eq('id', candidate.profile_id)
        .single();
      
      if (!profileError) {
        profile = profileData;
      }
    }
    
    if (candidateError) {
      console.error('❌ Erreur candidat:', candidateError);
      return;
    }
    
    console.log('✅ Candidat après onboarding:', {
      id: candidate.id,
      email: candidate.email,
      qualification_status: candidate.qualification_status,
      profile_id: candidate.profile_id,
      profile: profile
    });
    
    // 2. Vérifier les compétences du candidat
    console.log('\n🎯 Step 2: Compétences du candidat...');
    const { data: candidateExpertises, error: expertiseError } = await supabase
      .from('candidate_expertises')
      .select(`
        *,
        hr_expertises (
          id,
          name,
          category_id
        )
      `)
      .eq('candidate_id', candidate.id);
    
    if (expertiseError) {
      console.error('❌ Erreur compétences:', expertiseError);
    } else {
      console.log('📊 Compétences du candidat:', candidateExpertises);
    }
    
    // 3. Vérifier les langues du candidat
    console.log('\n🌍 Step 3: Langues du candidat...');
    const { data: candidateLanguages, error: languageError } = await supabase
      .from('candidate_languages')
      .select(`
        *,
        hr_languages (
          id,
          name,
          code
        )
      `)
      .eq('candidate_id', candidate.id);
    
    if (languageError) {
      console.error('❌ Erreur langues:', languageError);
    } else {
      console.log('🗣️ Langues du candidat:', candidateLanguages);
    }
    
    // 4. Vérifier les assignments disponibles pour ce profil
    console.log('\n📋 Step 4: Assignments disponibles pour ce profil métier...');
    const { data: availableAssignments, error: assignmentsError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        profile_id,
        candidate_id,
        booking_status,
        projects (
          id,
          title,
          status,
          description
        ),
        hr_profiles (
          name
        )
      `)
      .eq('profile_id', candidate.profile_id)
      .is('candidate_id', null)
      .eq('booking_status', 'pending');
    
    if (assignmentsError) {
      console.error('❌ Erreur assignments:', assignmentsError);
    } else {
      console.log('📊 Assignments disponibles pour ce profil:', availableAssignments);
    }
    
    // 5. Vérifier TOUS les assignments disponibles (tous profils)
    console.log('\n📋 Step 5: TOUS les assignments disponibles...');
    const { data: allAssignments, error: allAssignmentsError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        profile_id,
        candidate_id,
        booking_status,
        projects (
          id,
          title,
          status,
          description
        ),
        hr_profiles (
          name
        )
      `)
      .is('candidate_id', null)
      .eq('booking_status', 'pending')
      .limit(10);
    
    if (allAssignmentsError) {
      console.error('❌ Erreur tous assignments:', allAssignmentsError);
    } else {
      console.log('📊 Tous les assignments disponibles:', allAssignments);
    }
    
    // 6. Vérifier les projets actifs sans assignments
    console.log('\n📁 Step 6: Projets actifs...');
    const { data: activeProjects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'play')
      .limit(10);
    
    if (projectsError) {
      console.error('❌ Erreur projets actifs:', projectsError);
    } else {
      console.log('📊 Projets actifs:', activeProjects);
    }
    
    // 7. Vérifier si des assignments existent pour ces projets
    if (activeProjects && activeProjects.length > 0) {
      console.log('\n🔍 Step 7: Assignments pour les projets actifs...');
      
      for (const project of activeProjects.slice(0, 3)) {
        const { data: projectAssignments, error: projAssignError } = await supabase
          .from('hr_resource_assignments')
          .select(`
            id,
            profile_id,
            candidate_id,
            booking_status,
            hr_profiles (name)
          `)
          .eq('project_id', project.id);
        
        if (!projAssignError) {
          console.log(`📋 Assignments pour projet "${project.title}":`, projectAssignments);
        }
      }
    }
    
    console.log('\n🎉 Debug terminé !');
    
  } catch (err) {
    console.error('💥 Erreur:', err);
  }
}

debugProjectMatching();