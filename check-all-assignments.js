import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIyNDkyMjUsImV4cCI6MjAzNzgyNTIyNX0.4BRPKfKdLSi_6VuVVYscYQY7JajN4CJvPaOhNHPKyhM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllAssignments() {
  console.log('🔍 ANALYSE COMPLÈTE DES ASSIGNMENTS');
  console.log('=====================================\n');
  
  // 1. Tous les assignments
  const { data: allAssignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects!inner (
        id,
        title,
        status
      ),
      hr_profiles!inner (
        name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20);
  
  console.log(`📋 Total des assignments (20 derniers): ${allAssignments?.length || 0}\n`);
  
  // Grouper par statut de booking
  const byStatus = {};
  allAssignments?.forEach(a => {
    const status = a.booking_status || 'unknown';
    if (!byStatus[status]) byStatus[status] = [];
    byStatus[status].push(a);
  });
  
  console.log('PAR STATUT DE BOOKING:');
  Object.entries(byStatus).forEach(([status, assignments]) => {
    console.log(`\n${status.toUpperCase()}: ${assignments.length} assignments`);
    assignments.slice(0, 5).forEach(a => {
      console.log(`  - ${a.projects.title} | ${a.hr_profiles.name} | ${a.seniority} | candidate_id: ${a.candidate_id || 'NULL'}`);
    });
  });
  
  // 2. Test spécifique pour le candidat
  console.log('\n=====================================');
  console.log('TEST CANDIDAT fmeleard+ressource_2@gmail.com:\n');
  
  const { data: candidate } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('email', 'fmeleard+ressource_2@gmail.com')
    .single();
  
  if (candidate) {
    console.log('Candidat trouvé:');
    console.log('  ID:', candidate.id);
    console.log('  Profile ID:', candidate.profile_id);
    console.log('  Seniority:', candidate.seniority);
    console.log('  Status:', candidate.status);
    
    // Assignments qui matchent son profil
    const { data: matchingAssignments } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        projects (title)
      `)
      .eq('profile_id', candidate.profile_id)
      .eq('seniority', candidate.seniority);
    
    console.log(`\nAssignments qui matchent son profil/séniorité: ${matchingAssignments?.length || 0}`);
    matchingAssignments?.forEach(a => {
      const shouldSee = (!a.candidate_id || a.candidate_id === candidate.id) && 
                       (a.booking_status === 'recherche' || a.booking_status === 'draft');
      console.log(`  - ${a.projects?.title}`);
      console.log(`    Booking: ${a.booking_status} | Candidate ID: ${a.candidate_id || 'NULL'}`);
      console.log(`    → Devrait voir: ${shouldSee ? '✅ OUI' : '❌ NON'}`);
    });
  }
  
  // 3. Créer un assignment de test si nécessaire
  console.log('\n=====================================');
  console.log('CRÉATION D\'UN ASSIGNMENT DE TEST:\n');
  
  // Vérifier s'il existe un projet de test
  const { data: testProject } = await supabase
    .from('projects')
    .select('id, title')
    .eq('title', 'Test Comptable Junior')
    .single();
  
  if (!testProject) {
    console.log('❌ Pas de projet "Test Comptable Junior" trouvé');
    console.log('Créez d\'abord un projet avec ce titre depuis l\'interface client');
  } else {
    console.log('✅ Projet test trouvé:', testProject.title);
    
    // Vérifier s'il y a déjà un assignment
    const { data: existingAssignment } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .eq('project_id', testProject.id)
      .eq('profile_id', candidate?.profile_id)
      .single();
    
    if (existingAssignment) {
      console.log('Assignment existant:');
      console.log('  Booking status:', existingAssignment.booking_status);
      console.log('  Candidate ID:', existingAssignment.candidate_id);
      
      // Le mettre en recherche si nécessaire
      if (existingAssignment.booking_status !== 'recherche') {
        const { error } = await supabase
          .from('hr_resource_assignments')
          .update({
            booking_status: 'recherche',
            candidate_id: null
          })
          .eq('id', existingAssignment.id);
        
        if (!error) {
          console.log('✅ Assignment mis à jour en statut "recherche"');
        }
      }
    }
  }
}

checkAllAssignments().catch(console.error);