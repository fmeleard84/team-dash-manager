import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProject1233() {
  console.log('=== ANALYSE COMPLÈTE DU PROJET 1233 ===\n');
  
  const candidateId = '7f24d9c5-54eb-4185-815b-79daf6cdf4da';
  const candidateEmail = 'fmeleard+new_cdp_id4@gmail.com';
  
  // 1. Chercher le projet 1233
  console.log('1. RECHERCHE DU PROJET 1233:');
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      client_profiles(email, company_name)
    `)
    .eq('title', '1233')
    .single();
    
  if (error || !project) {
    console.log('❌ Projet 1233 introuvable');
    console.log('Erreur:', error);
    
    // Chercher les projets récents
    const { data: recentProjects } = await supabase
      .from('projects')
      .select('id, title, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
      
    console.log('\nProjets récents:');
    if (recentProjects) {
      recentProjects.forEach(p => {
        console.log(`  - ${p.title} (${p.status}) - ${p.created_at}`);
      });
    }
    process.exit(1);
  }
  
  console.log('✅ Projet trouvé:');
  console.log('  - ID:', project.id);
  console.log('  - Title:', project.title);
  console.log('  - Owner ID:', project.owner_id);
  console.log('  - Client:', project.client_profiles?.email);
  console.log('  - Status:', project.status);
  console.log('  - Start Date:', project.start_date);
  console.log('  - Created:', project.created_at);
  
  // 2. Vérifier les assignations
  console.log('\n2. ASSIGNATIONS (hr_resource_assignments):');
  const { data: assignments } = await supabase
    .from('hr_resource_assignments')
    .select('*')
    .eq('project_id', project.id);
    
  if (!assignments || assignments.length === 0) {
    console.log('❌ AUCUNE ASSIGNATION TROUVÉE');
    console.log('   → Le booking n\'a pas créé d\'assignations');
    console.log('   → Le candidat ne peut pas voir le projet sans assignation');
  } else {
    console.log(`✅ ${assignments.length} assignation(s) trouvée(s):`);
    assignments.forEach((a, i) => {
      console.log(`\n  ${i+1}. Assignment ID: ${a.id}`);
      console.log(`     - Resource ID: ${a.resource_id || 'NULL'}`);
      console.log(`     - Candidate ID: ${a.candidate_id || 'NULL'}`);
      console.log(`     - Profile ID: ${a.profile_id}`);
      console.log(`     - Seniority: ${a.seniority}`);
      console.log(`     - Booking Status: ${a.booking_status}`);
      console.log(`     - Languages: ${JSON.stringify(a.languages)}`);
      console.log(`     - Expertises: ${JSON.stringify(a.expertises)}`);
    });
  }
  
  // 3. Vérifier le candidat
  console.log('\n3. CANDIDAT:');
  const { data: candidate } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('id', candidateId)
    .single();
    
  if (candidate) {
    console.log('✅ Candidat trouvé:');
    console.log('  - ID:', candidate.id);
    console.log('  - Email:', candidate.email);
    console.log('  - Profile ID:', candidate.profile_id);
    console.log('  - Seniority:', candidate.seniority);
    console.log('  - Status:', candidate.status);
    
    // Vérifier les compétences
    const { data: skills } = await supabase
      .from('candidate_skills')
      .select('*')
      .eq('candidate_id', candidateId);
      
    if (skills && skills.length > 0) {
      console.log(`  - Compétences: ${skills.length} trouvées`);
      const languages = skills.filter(s => s.skill_type === 'language');
      const expertises = skills.filter(s => s.skill_type === 'expertise');
      console.log(`    • Langues: ${languages.map(l => l.skill_id).join(', ') || 'Aucune'}`);
      console.log(`    • Expertises: ${expertises.map(e => e.skill_id).join(', ') || 'Aucune'}`);
    } else {
      console.log('  - Compétences: AUCUNE');
    }
  }
  
  // 4. Analyser le matching
  console.log('\n4. ANALYSE DU MATCHING:');
  if (assignments && assignments.length > 0) {
    let matchFound = false;
    
    assignments.forEach((a, i) => {
      console.log(`\n  Assignment ${i+1}:`);
      
      const profileMatch = a.profile_id === candidate.profile_id;
      const seniorityMatch = a.seniority === candidate.seniority;
      const statusOk = a.booking_status === 'recherche' || a.candidate_id === candidateId;
      
      console.log(`    - Profile match: ${profileMatch ? '✅' : '❌'} (${a.profile_id} vs ${candidate.profile_id})`);
      console.log(`    - Seniority match: ${seniorityMatch ? '✅' : '❌'} (${a.seniority} vs ${candidate.seniority})`);
      console.log(`    - Status OK: ${statusOk ? '✅' : '❌'} (${a.booking_status})`);
      
      if (profileMatch && seniorityMatch && statusOk) {
        console.log(`    → ✅ CETTE ASSIGNATION DEVRAIT MATCHER`);
        matchFound = true;
      } else {
        console.log(`    → ❌ Pas de match`);
      }
    });
    
    if (!matchFound) {
      console.log('\n❌ PROBLÈME: Aucune assignation ne matche le candidat');
      console.log('   Raisons possibles:');
      console.log('   - Profile ID différent');
      console.log('   - Seniority différente');
      console.log('   - Booking status incorrect');
    }
  }
  
  // 5. Vérifier le code de matching côté client
  console.log('\n5. REQUÊTE SQL SIMULÉE POUR LE MATCHING:');
  console.log(`
SELECT * FROM hr_resource_assignments
WHERE project_id = '${project?.id}'
  AND profile_id = '${candidate?.profile_id}'
  AND seniority = '${candidate?.seniority}'
  AND (booking_status = 'recherche' OR candidate_id = '${candidateId}')
  `);
  
  // Faire la requête
  if (project && candidate) {
    const { data: matchingAssignments } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .eq('project_id', project.id)
      .eq('profile_id', candidate.profile_id)
      .eq('seniority', candidate.seniority)
      .or(`booking_status.eq.recherche,candidate_id.eq.${candidateId}`);
      
    console.log('\nRésultat de la requête de matching:');
    if (matchingAssignments && matchingAssignments.length > 0) {
      console.log(`✅ ${matchingAssignments.length} assignation(s) trouvée(s) qui devraient être visibles`);
    } else {
      console.log('❌ Aucune assignation ne matche les critères');
    }
  }
  
  console.log('\n\n=== DIAGNOSTIC FINAL ===');
  if (!assignments || assignments.length === 0) {
    console.log('❌ Le problème principal: PAS D\'ASSIGNATIONS');
    console.log('   → Le booking n\'a pas créé les hr_resource_assignments');
    console.log('   → Vérifier la fonction handleBookingTeam dans ProjectCard.tsx');
  } else if (candidate && assignments.some(a => 
    a.profile_id === candidate.profile_id && 
    a.seniority === candidate.seniority)) {
    console.log('✅ Les assignations existent et matchent');
    console.log('   → Vérifier le code de CandidateDashboard.tsx');
    console.log('   → Vérifier les filtres sur le status du projet');
  } else {
    console.log('❌ Les assignations existent mais ne matchent pas');
    console.log('   → Vérifier les IDs des profils HR');
    console.log('   → Vérifier la séniorité');
  }
  
  process.exit(0);
}

checkProject1233().catch(console.error);