import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCandidate() {
  console.log('=== ANALYSE CANDIDAT fmeleard+new_cdp_id4@gmail.com ===\n');

  // 1. Vérifier le candidat dans candidate_profiles
  const { data: candidate, error: candidateError } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('email', 'fmeleard+new_cdp_id4@gmail.com')
    .single();

  if (candidateError) {
    console.error('Erreur récupération candidat:', candidateError);
    return;
  }

  console.log('CANDIDAT TROUVÉ:');
  console.log('- ID (nouveau):', candidate.id);
  console.log('- Old ID:', candidate.old_id);
  console.log('- Email:', candidate.email);
  console.log('- Profile ID:', candidate.profile_id);
  console.log('- Seniority:', candidate.seniority);
  console.log('- Status:', candidate.status);
  console.log('- Qualification Status:', candidate.qualification_status);
  console.log('\n');

  // 2. Vérifier les compétences du candidat
  const { data: skills, error: skillsError } = await supabase
    .from('candidate_skills')
    .select('*')
    .eq('candidate_id', candidate.id);

  console.log('COMPÉTENCES DU CANDIDAT:');
  if (skills && skills.length > 0) {
    skills.forEach(s => {
      console.log(`- ${s.skill_type}: ${s.skill_value}`);
    });
  } else {
    console.log('Aucune compétence trouvée');
  }
  console.log('\n');

  // 3. Vérifier si le candidat a des assignations
  const { data: candidateAssignments, error: assignError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects(name, status),
      hr_resources(
        profile_id,
        seniority,
        languages,
        expertise,
        hr_profiles(label)
      )
    `)
    .eq('candidate_id', candidate.id);

  console.log('ASSIGNATIONS DU CANDIDAT:');
  if (candidateAssignments && candidateAssignments.length > 0) {
    candidateAssignments.forEach(a => {
      console.log(`\n- Projet: ${a.projects?.name}`);
      console.log(`  Status projet: ${a.projects?.status}`);
      console.log(`  Booking Status: ${a.booking_status}`);
      console.log(`  Profile recherché: ${a.hr_resources?.hr_profiles?.label}`);
      console.log(`  Seniority recherchée: ${a.hr_resources?.seniority}`);
    });
  } else {
    console.log('Aucune assignation trouvée pour ce candidat');
  }
  console.log('\n');

  // 4. Vérifier avec l'ancien ID aussi
  console.log('=== VÉRIFICATION AVEC OLD_ID ===');
  if (candidate.old_id) {
    const { data: oldAssignments, error: oldError } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .eq('candidate_id', candidate.old_id);

    if (oldAssignments && oldAssignments.length > 0) {
      console.log(`ATTENTION: ${oldAssignments.length} assignations trouvées avec l'ancien ID!`);
      oldAssignments.forEach(a => {
        console.log(`- Assignment ID: ${a.id}, Project: ${a.project_id}, Status: ${a.booking_status}`);
      });
    } else {
      console.log('Aucune assignation avec l\'ancien ID');
    }
  }

  process.exit(0);
}

checkCandidate().catch(console.error);