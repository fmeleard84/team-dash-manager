import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClientProjects() {
  console.log('=== VÉRIFICATION DES PROJETS DU CLIENT ===\n');
  
  const clientId = '6352b49b-6bb2-40f0-a9fd-e83ea430be32';
  const clientEmail = 'fmeleard+clienr_1119@gmail.com';
  
  console.log(`Client: ${clientEmail}`);
  console.log(`ID: ${clientId}\n`);
  
  // 1. Chercher les projets de ce client
  console.log('1. PROJETS DU CLIENT:');
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', clientId)
    .order('created_at', { ascending: false });
    
  if (!projects || projects.length === 0) {
    console.log('❌ Aucun projet trouvé pour ce client');
    console.log('   → Le client doit créer un nouveau projet');
  } else {
    console.log(`✅ ${projects.length} projet(s) trouvé(s):`);
    
    for (const project of projects) {
      console.log(`\nProjet: ${project.title}`);
      console.log('  - ID:', project.id);
      console.log('  - Status:', project.status);
      console.log('  - Created:', project.created_at);
      
      // Vérifier les assignations
      const { data: assignments } = await supabase
        .from('hr_resource_assignments')
        .select('*')
        .eq('project_id', project.id);
        
      if (assignments && assignments.length > 0) {
        console.log(`  - Assignations: ${assignments.length}`);
        assignments.forEach(a => {
          console.log(`    • Profile: ${a.profile_id}, Status: ${a.booking_status}`);
        });
      } else {
        console.log('  - Assignations: 0 (pas encore de booking)');
      }
    }
  }
  
  // 2. Vérifier le candidat
  console.log('\n\n2. CANDIDAT CIBLE:');
  const candidateEmail = 'fmeleard+new_cdp_id4@gmail.com';
  const { data: candidate } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('email', candidateEmail)
    .single();
    
  if (candidate) {
    console.log('✅ Candidat disponible:');
    console.log('  - ID:', candidate.id);
    console.log('  - Profile ID:', candidate.profile_id);
    console.log('  - Seniority:', candidate.seniority);
    console.log('  - Status:', candidate.status);
  }
  
  console.log('\n\n=== PROCHAINE ÉTAPE ===');
  if (!projects || projects.length === 0) {
    console.log('1. Le client doit créer un nouveau projet');
    console.log('2. Définir les ressources HR dans ReactFlow');
    console.log('3. Cliquer sur "Booker équipe"');
    console.log('4. Le candidat devrait voir le projet');
  } else {
    console.log('1. Vérifier que le booking crée bien les assignations');
    console.log('2. Vérifier le matching côté candidat');
  }
  
  process.exit(0);
}

checkClientProjects().catch(console.error);