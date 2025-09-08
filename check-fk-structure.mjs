import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFKStructure() {
  console.log('=== VÉRIFICATION STRUCTURE ET DONNÉES ===\n');
  
  const candidateId = '7f24d9c5-54eb-4185-815b-79daf6cdf4da';
  
  // 1. Vérifier une assignation spécifique
  console.log('1. ASSIGNATION DU PROJET 1233:');
  const { data: assignment1233 } = await supabase
    .from('hr_resource_assignments')
    .select('*')
    .eq('project_id', '51a63396-3b8b-4d84-a1b5-7a730f3d4a17') // ID du projet 1233
    .single();
    
  if (assignment1233) {
    console.log('✅ Assignation trouvée:');
    console.log('  - ID:', assignment1233.id);
    console.log('  - Project ID:', assignment1233.project_id);
    console.log('  - Profile ID:', assignment1233.profile_id);
    console.log('  - Seniority:', assignment1233.seniority);
    console.log('  - Booking Status:', assignment1233.booking_status);
    console.log('  - Candidate ID:', assignment1233.candidate_id);
  }
  
  // 2. Tester la jointure avec projects
  console.log('\n2. TEST JOINTURE AVEC PROJECTS:');
  const { data: withJoin, error: joinError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects (
        id,
        title,
        status
      )
    `)
    .eq('project_id', '51a63396-3b8b-4d84-a1b5-7a730f3d4a17');
    
  if (joinError) {
    console.log('❌ Erreur jointure:', joinError);
  } else if (withJoin && withJoin.length > 0) {
    console.log('✅ Jointure réussie:');
    withJoin.forEach(a => {
      console.log('  - Assignment:', a.id);
      console.log('    Project:', a.projects?.title || 'NULL');
    });
  }
  
  // 3. Tester la requête complète comme dans le code
  console.log('\n3. TEST REQUÊTE COMPLÈTE (comme dans CandidateDashboard):');
  const { data: fullQuery, error: fullError } = await supabase
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
        client_budget,
        owner_id
      )
    `)
    .or(`candidate_id.eq.${candidateId},booking_status.eq.recherche`);
    
  if (fullError) {
    console.log('❌ Erreur requête complète:', fullError);
  } else {
    console.log(`✅ ${fullQuery?.length || 0} assignation(s) trouvée(s)`);
    
    // Filtrer pour les projets cibles
    const targetProjects = ['1233', 'test1217', 'test1155'];
    const relevantAssignments = fullQuery?.filter(a => 
      a.projects && targetProjects.includes(a.projects.title)
    );
    
    if (relevantAssignments && relevantAssignments.length > 0) {
      console.log('\nProjets visibles:');
      relevantAssignments.forEach(a => {
        console.log(`  - "${a.projects.title}" - Status: ${a.booking_status}`);
      });
    } else {
      console.log('\n❌ Aucun des projets cibles n\'est visible');
    }
  }
  
  // 4. Vérifier si c'est un problème de matching
  console.log('\n4. VÉRIFICATION DU MATCHING:');
  const { data: candidate } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('id', candidateId)
    .single();
    
  const { data: allAssignments } = await supabase
    .from('hr_resource_assignments')
    .select('*')
    .in('project_id', [
      '51a63396-3b8b-4d84-a1b5-7a730f3d4a17', // 1233
      '4ec0b104-2fef-4f3c-be22-9e504903fc75', // test1217
      'cff8241a-0d0e-46bc-bd95-938c628519eb'  // test1155
    ]);
    
  if (allAssignments) {
    allAssignments.forEach(a => {
      const profileMatch = a.profile_id === candidate?.profile_id;
      const seniorityMatch = a.seniority === candidate?.seniority;
      const statusOk = a.booking_status === 'recherche';
      
      console.log(`\nProjet ${a.project_id.substring(0, 8)}...`);
      console.log(`  Profile: ${profileMatch ? '✅' : '❌'} (${a.profile_id} vs ${candidate?.profile_id})`);
      console.log(`  Seniority: ${seniorityMatch ? '✅' : '❌'} (${a.seniority} vs ${candidate?.seniority})`);
      console.log(`  Status: ${statusOk ? '✅' : '❌'} (${a.booking_status})`);
      console.log(`  → Devrait être visible: ${profileMatch && seniorityMatch && statusOk ? '✅' : '❌'}`);
    });
  }
  
  process.exit(0);
}

checkFKStructure().catch(console.error);