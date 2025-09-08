import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFinalMatching() {
  console.log('=== TEST FINAL DU MATCHING ===\n');
  
  const candidateId = '7f24d9c5-54eb-4185-815b-79daf6cdf4da';
  
  // 1. Test exact de la requête du code
  console.log('1. REQUÊTE EXACTE DU CODE:');
  const { data: assignments, error } = await supabase
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
    
  if (error) {
    console.log('❌ Erreur:', error);
  } else if (!assignments || assignments.length === 0) {
    console.log('❌ Aucune assignation trouvée');
  } else {
    console.log(`✅ ${assignments.length} assignation(s) trouvée(s):`);
    
    assignments.forEach(a => {
      console.log(`\n  - Projet: "${a.projects?.title || 'SANS PROJET'}" (${a.project_id})`);
      console.log(`    Status: ${a.booking_status}`);
      console.log(`    Profile: ${a.profile_id}`);
      console.log(`    Seniority: ${a.seniority}`);
      console.log(`    Candidate: ${a.candidate_id || 'Non assigné'}`);
    });
  }
  
  // 2. Vérifier les données du candidat
  console.log('\n\n2. DONNÉES DU CANDIDAT:');
  const { data: candidate } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('id', candidateId)
    .single();
    
  if (candidate) {
    console.log('✅ Candidat:');
    console.log('  - ID:', candidate.id);
    console.log('  - Profile ID:', candidate.profile_id);
    console.log('  - Seniority:', candidate.seniority);
    console.log('  - Status:', candidate.status);
  }
  
  // 3. Vérifier les projets directement
  console.log('\n3. PROJETS EXISTANTS:');
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, status, owner_id')
    .in('title', ['1233', 'test1217', 'test1155']);
    
  if (projects) {
    projects.forEach(p => {
      console.log(`  - "${p.title}" (${p.id}) - Status: ${p.status}`);
    });
  }
  
  // 4. Vérifier pourquoi les assignations ne sont pas retournées
  console.log('\n4. DEBUG - TOUTES LES ASSIGNATIONS:');
  const { data: allAssignments } = await supabase
    .from('hr_resource_assignments')
    .select('project_id, profile_id, seniority, booking_status, candidate_id')
    .limit(10);
    
  if (allAssignments && allAssignments.length > 0) {
    console.log(`Total: ${allAssignments.length} assignations`);
    
    // Compter celles qui devraient matcher
    const shouldMatch = allAssignments.filter(a => 
      a.booking_status === 'recherche' || a.candidate_id === candidateId
    );
    
    console.log(`  - En recherche ou assignées au candidat: ${shouldMatch.length}`);
    
    // Vérifier les projets 1233, test1217, test1155
    const targetProjectIds = [
      '51a63396-3b8b-4d84-a1b5-7a730f3d4a17', // 1233
      '4ec0b104-2fef-4f3c-be22-9e504903fc75', // test1217  
      'cff8241a-0d0e-46bc-bd95-938c628519eb'  // test1155
    ];
    
    const targetAssignments = allAssignments.filter(a => 
      targetProjectIds.includes(a.project_id)
    );
    
    console.log(`  - Pour les 3 projets cibles: ${targetAssignments.length}`);
    targetAssignments.forEach(a => {
      console.log(`    • Project ${a.project_id.substring(0, 8)}... - Status: ${a.booking_status}`);
    });
  }
  
  console.log('\n\n=== CONCLUSION ===');
  if (!assignments || assignments.length === 0) {
    console.log('❌ La requête OR ne fonctionne pas correctement');
    console.log('   Possible problème de RLS ou de syntaxe de requête');
  } else {
    const visibleProjects = assignments.filter(a => a.projects).map(a => a.projects.title);
    console.log('✅ Projets visibles:', visibleProjects.join(', ') || 'Aucun');
  }
  
  process.exit(0);
}

testFinalMatching().catch(console.error);