import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeBookingProcess() {
  console.log('=== ANALYSE DU PROCESSUS DE BOOKING ===\n');

  // 1. Chercher le candidat
  const candidateEmail = 'fmeleard+new_cdp_id4@gmail.com';
  console.log('1. CANDIDAT:', candidateEmail);
  
  const { data: candidate } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('email', candidateEmail)
    .single();

  if (candidate) {
    console.log('- ID:', candidate.id);
    console.log('- Profile ID:', candidate.profile_id);
    console.log('- Status:', candidate.status);
    console.log('- Seniority:', candidate.seniority);
    
    // 2. Chercher TOUTES les assignations de ressources
    console.log('\n2. TOUTES LES ASSIGNATIONS HR:');
    const { data: allAssignments } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        projects(title, status),
        hr_resources(
          profile_id,
          seniority,
          languages,
          expertise,
          hr_profiles(label)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (allAssignments && allAssignments.length > 0) {
      console.log(`\nTotal: ${allAssignments.length} assignations récentes`);
      allAssignments.forEach(a => {
        console.log(`\n- Projet: ${a.projects?.title || a.project_id}`);
        console.log('  Assignment ID:', a.id);
        console.log('  Candidate ID:', a.candidate_id);
        console.log('  Resource ID:', a.resource_id);
        console.log('  Booking Status:', a.booking_status);
        console.log('  Project Status:', a.projects?.status);
        console.log('  Profile recherché:', a.hr_resources?.hr_profiles?.label);
        console.log('  Match candidat?:', a.candidate_id === candidate.id ? '✅ OUI' : '❌ NON');
      });
    } else {
      console.log('❌ Aucune assignation trouvée');
    }

    // 3. Chercher les ressources qui correspondent au profil du candidat
    console.log('\n3. RESSOURCES CORRESPONDANT AU CANDIDAT:');
    const { data: matchingResources } = await supabase
      .from('hr_resources')
      .select(`
        *,
        hr_profiles(label),
        projects(title, status)
      `)
      .eq('profile_id', candidate.profile_id)
      .eq('seniority', candidate.seniority);

    if (matchingResources && matchingResources.length > 0) {
      console.log(`\n✅ ${matchingResources.length} ressource(s) correspondante(s):`);
      matchingResources.forEach(r => {
        console.log(`\n- Projet: ${r.projects?.title}`);
        console.log('  Resource ID:', r.id);
        console.log('  Project ID:', r.project_id);
        console.log('  Profile:', r.hr_profiles?.label);
        console.log('  Seniority:', r.seniority);
        console.log('  Project Status:', r.projects?.status);
        
        // Vérifier si cette ressource a une assignation
        console.log('\n  Recherche assignation pour cette ressource...');
      });
      
      // Pour chaque ressource, vérifier les assignations
      for (const resource of matchingResources) {
        const { data: resourceAssignment } = await supabase
          .from('hr_resource_assignments')
          .select('*')
          .eq('resource_id', resource.id)
          .single();
          
        if (resourceAssignment) {
          console.log(`\n  ⚠️ Assignation trouvée pour resource ${resource.id}:`);
          console.log('    - Assignment ID:', resourceAssignment.id);
          console.log('    - Candidate ID:', resourceAssignment.candidate_id);
          console.log('    - Booking Status:', resourceAssignment.booking_status);
          console.log('    - Est-ce notre candidat?:', resourceAssignment.candidate_id === candidate.id ? '✅' : '❌');
        } else {
          console.log(`  ❌ Pas d'assignation pour resource ${resource.id}`);
        }
      }
    } else {
      console.log('❌ Aucune ressource correspondante');
    }
  }

  // 4. Comprendre la structure complète
  console.log('\n\n4. STRUCTURE DES RELATIONS:');
  console.log('projects → hr_resources → hr_resource_assignments → candidate_profiles');
  console.log('\nPour qu\'un candidat voie un projet:');
  console.log('1. Le projet doit avoir des hr_resources définies');
  console.log('2. Une hr_resource_assignment doit exister avec:');
  console.log('   - resource_id pointant vers la ressource');
  console.log('   - candidate_id = ID du candidat');
  console.log('   - booking_status = "recherche" ou "accepted"');
  console.log('3. Le projet doit avoir un certain status pour être visible');

  process.exit(0);
}

analyzeBookingProcess().catch(console.error);