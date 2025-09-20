import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function checkNewProject() {
  const userId = '6cc0150b-30ef-4020-ba1b-ca20ba685310'; // Francis Meleard
  
  console.log('🔍 Recherche du projet "Projet New key"...\n');
  
  // 1. Trouver le projet
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('title', 'Projet New key')
    .single();
    
  if (project) {
    console.log('✅ Projet trouvé:');
    console.log('  - ID:', project.id);
    console.log('  - Status:', project.status);
    console.log('  - Date:', project.project_date);
    console.log('  - Owner:', project.owner_id);
    
    // 2. Vérifier les assignments sur ce projet
    console.log('\n📊 Vérification des assignments...');
    const { data: assignments } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        hr_profiles (
          id,
          name,
          category_id
        )
      `)
      .eq('project_id', project.id);
      
    console.log('Nombre assignments trouvés:', assignments?.length || 0);
    
    if (assignments && assignments.length > 0) {
      assignments.forEach((a, i) => {
        console.log(`\n  Assignment ${i+1}:`);
        console.log('    - ID:', a.id);
        console.log('    - booking_status:', a.booking_status);
        console.log('    - candidate_id:', a.candidate_id);
        console.log('    - profile_id:', a.profile_id);
        console.log('    - seniority:', a.seniority);
        if (a.hr_profiles) {
          console.log('    - Métier (hr_profiles.name):', a.hr_profiles.name || 'NULL');
        } else {
          console.log('    - ⚠️ Pas de hr_profiles joint!');
        }
        
        // Vérifier si c'est notre candidat
        if (a.candidate_id === userId) {
          console.log('    ✅ CANDIDAT TROUVÉ!');
          console.log('    - Son booking_status:', a.booking_status);
        }
      });
    }
    
    // 3. Vérifier pourquoi le métier est "Non défini"
    console.log('\n🔍 Diagnostic du problème "Non défini"...');
    
    if (assignments && assignments.length > 0) {
      const candidateAssignment = assignments.find(a => a.candidate_id === userId);
      if (candidateAssignment) {
        console.log('\n💡 Assignment du candidat:');
        console.log('  - profile_id:', candidateAssignment.profile_id);
        
        // Vérifier le hr_profile directement
        if (candidateAssignment.profile_id) {
          const { data: hrProfile } = await supabase
            .from('hr_profiles')
            .select('*')
            .eq('id', candidateAssignment.profile_id)
            .single();
            
          if (hrProfile) {
            console.log('\n📋 HR Profile trouvé:');
            console.log('  - name:', hrProfile.name);
            console.log('  - label:', hrProfile.label || 'N/A');
            console.log('  - category_id:', hrProfile.category_id);
          } else {
            console.log('  ❌ HR Profile introuvable pour ID:', candidateAssignment.profile_id);
          }
        } else {
          console.log('  ❌ profile_id est NULL dans assignment');
        }
      }
    }
    
    // 4. Test de la requête utilisée par useCandidateProjectsOptimized
    console.log('\n🔍 Test de la requête du hook...');
    const { data: hookTest, error: hookError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        projects (
          id,
          title,
          description,
          status,
          project_date,
          due_date,
          client_budget
        )
      `)
      .eq('candidate_id', userId)
      .eq('booking_status', 'accepted');
      
    console.log('Résultat requête hook:');
    console.log('  - Nombre de résultats:', hookTest?.length || 0);
    if (hookError) {
      console.log('  - Erreur:', hookError);
    }
    
    if (hookTest && hookTest.length > 0) {
      hookTest.forEach(h => {
        console.log(`  - Projet: ${h.projects?.title}, status: ${h.projects?.status}`);
      });
    }
  } else {
    console.log('❌ Projet "Projet New key" introuvable');
  }
}

checkNewProject().catch(console.error);
