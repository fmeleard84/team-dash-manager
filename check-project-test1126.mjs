import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProject() {
  console.log('=== ANALYSE PROJET TEST1126 ===\n');

  // 1. Vérifier le projet
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('title', 'test1126')
    .single();

  if (projectError) {
    console.error('Erreur récupération projet:', projectError);
    return;
  }

  console.log('PROJET TROUVÉ:');
  console.log('- ID:', project.id);
  console.log('- Titre:', project.title);
  console.log('- Status:', project.status);
  console.log('- Owner ID:', project.owner_id);
  console.log('- Date création:', project.created_at);
  console.log('\n');

  // 2. Vérifier les ressources du projet
  const { data: resources, error: resourcesError } = await supabase
    .from('hr_resources')
    .select(`
      *,
      hr_profiles(label, name)
    `)
    .eq('project_id', project.id);

  if (resourcesError) {
    console.error('Erreur récupération ressources:', resourcesError);
    return;
  }

  console.log('RESSOURCES DU PROJET:');
  resources.forEach(r => {
    console.log(`\n- Ressource ID: ${r.id}`);
    console.log(`  Profile: ${r.hr_profiles?.label || r.profile_id}`);
    console.log(`  Seniority: ${r.seniority}`);
    console.log(`  Langues: ${r.languages}`);
    console.log(`  Expertises: ${r.expertise}`);
  });
  console.log('\n');

  // 3. Vérifier les assignations
  const { data: assignments, error: assignmentsError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      hr_resources(
        profile_id,
        seniority,
        languages,
        expertise,
        hr_profiles(label)
      )
    `)
    .eq('project_id', project.id);

  if (assignmentsError) {
    console.error('Erreur récupération assignations:', assignmentsError);
    return;
  }

  console.log('ASSIGNATIONS:');
  assignments.forEach(a => {
    console.log(`\n- Assignment ID: ${a.id}`);
    console.log(`  Resource ID: ${a.resource_id}`);
    console.log(`  Candidate ID: ${a.candidate_id}`);
    console.log(`  Booking Status: ${a.booking_status}`);
    console.log(`  Profile: ${a.hr_resources?.hr_profiles?.label}`);
    console.log(`  Seniority: ${a.hr_resources?.seniority}`);
  });

  process.exit(0);
}

checkProject().catch(console.error);