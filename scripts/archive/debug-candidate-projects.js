import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCandidateProjects() {
  console.log('🔍 Debug candidat projets pour fmeleard+ressource_5@gmail.com...');
  
  try {
    // 0. Vérifier dans la table profiles d'abord
    console.log('\n🔍 Step 0: Vérification dans la table profiles...');
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'fmeleard+ressource_5@gmail.com')
      .single();
    
    if (userError) {
      console.error('❌ Erreur profiles:', userError);
      console.log('🔍 Listing tous les profils existants...');
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('id, email, role, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      if (!allProfilesError) {
        console.log('📊 Profils existants:', allProfiles);
      }
    } else {
      console.log('✅ Profil utilisateur trouvé:', userProfile);
    }

    // 1. Vérifier le profil candidat
    console.log('\n👤 Step 1: Recherche du profil candidat...');
    
    // D'abord, vérifier tous les candidats existants
    console.log('\n📋 Listing tous les candidats existants...');
    const { data: allCandidates, error: allCandidatesError } = await supabase
      .from('candidate_profiles')
      .select('id, email, qualification_status, profile_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allCandidatesError) {
      console.error('❌ Erreur listing candidats:', allCandidatesError);
    } else {
      console.log('📊 Candidats existants:', allCandidates);
    }
    
    // Ensuite, chercher le candidat spécifique
    const { data: candidate, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('email', 'fmeleard+ressource_5@gmail.com')
      .single();
    
    if (candidateError) {
      console.error('❌ Erreur candidat:', candidateError);
      return;
    }
    
    if (!candidate) {
      console.log('❌ Aucun candidat trouvé');
      return;
    }
    
    console.log('✅ Candidat trouvé:', { 
      id: candidate.id, 
      email: candidate.email, 
      qualification_status: candidate.qualification_status,
      profile_id: candidate.profile_id 
    });
    
    // 2. Vérifier tous les bookings pour ce candidat (tous statuts)
    console.log('\n📋 Step 2: Recherche de TOUS les bookings pour ce candidat...');
    const { data: allBookings, error: bookingsError } = await supabase
      .from('project_bookings')
      .select(`
        *,
        projects (
          id,
          title,
          status
        )
      `)
      .eq('candidate_id', candidate.id);
    
    console.log('📊 Tous les bookings trouvés:', allBookings);
    
    if (bookingsError) {
      console.error('❌ Erreur bookings:', bookingsError);
    }
    
    if (!allBookings || allBookings.length === 0) {
      console.log('❌ Aucun booking trouvé pour ce candidat');
      
      // 3. Vérifier les assignments dans hr_resource_assignments
      console.log('\n🔍 Step 3: Recherche dans hr_resource_assignments...');
      const { data: assignments, error: assignmentsError } = await supabase
        .from('hr_resource_assignments')
        .select(`
          *,
          projects (
            id,
            title,
            status
          )
        `)
        .eq('candidate_id', candidate.id);
        
      console.log('📊 Assignments trouvés:', assignments);
      
      if (assignmentsError) {
        console.error('❌ Erreur assignments:', assignmentsError);
      }
      
      // 4. Vérifier les assignments disponibles (sans candidat assigné)
      console.log('\n🔍 Step 4: Recherche d\'assignments disponibles...');
      const { data: availableAssignments, error: availableError } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          profile_id,
          candidate_id,
          booking_status,
          projects (
            id,
            title,
            status
          )
        `)
        .is('candidate_id', null)
        .eq('booking_status', 'pending')
        .limit(10);
        
      console.log('📊 Assignments disponibles (sans candidat):', availableAssignments);
      
      if (availableError) {
        console.error('❌ Erreur assignments disponibles:', availableError);
      }
      
      // 5. Vérifier si le profil du candidat correspond aux assignments
      if (candidate.profile_id) {
        console.log('\n🎯 Step 5: Recherche d\'assignments pour le profil métier du candidat...');
        const { data: profileAssignments, error: profileError } = await supabase
          .from('hr_resource_assignments')
          .select(`
            id,
            profile_id,
            candidate_id,
            booking_status,
            projects (
              id,
              title,
              status
            )
          `)
          .eq('profile_id', candidate.profile_id)
          .limit(10);
          
        console.log('📊 Assignments pour ce profil métier:', profileAssignments);
        
        if (profileError) {
          console.error('❌ Erreur assignments profil:', profileError);
        }
      }
    } else {
      console.log('✅ Bookings trouvés:', allBookings.length);
      
      // Analyser les statuts
      const statusCounts = {};
      allBookings.forEach(booking => {
        statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
      });
      
      console.log('📊 Répartition des statuts:', statusCounts);
    }
    
    // 6. Vérifier tous les projets existants
    console.log('\n📁 Step 6: Vérification des projets existants...');
    const { data: allProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id, title, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (projectsError) {
      console.error('❌ Erreur projets:', projectsError);
    } else {
      console.log('📊 Projets existants (5 derniers):', allProjects);
    }
    
    console.log('\n🎉 Debug terminé !');
    
  } catch (err) {
    console.error('💥 Erreur:', err);
  }
}

debugCandidateProjects();