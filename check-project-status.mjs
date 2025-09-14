import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProject() {
  // Trouver le projet
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .ilike('title', '%Chef de Projet Anglophone%')
    .single();

  if (projectError) {
    console.error('Erreur projet:', projectError);
    return;
  }

  console.log('\n📋 PROJET:', project.title);
  console.log('  - ID:', project.id);
  console.log('  - Status:', project.status);
  console.log('  - Created:', project.created_at);

  // Vérifier les resource assignments
  const { data: assignments, error: assignError } = await supabase
    .from('hr_resource_assignments')
    .select('*, candidate_profiles(first_name, last_name)')
    .eq('project_id', project.id);

  if (!assignError && assignments) {
    console.log('\n👥 RESOURCE ASSIGNMENTS:');
    assignments.forEach(a => {
      console.log(`  - Profile ID: ${a.profile_id}`);
      console.log(`    Booking Status: ${a.booking_status}`);
      console.log(`    Candidate ID: ${a.candidate_id}`);
      if (a.candidate_profiles) {
        console.log(`    Candidate: ${a.candidate_profiles.first_name} ${a.candidate_profiles.last_name}`);
      }
    });
  }

  // Suggestions de correction
  if (project.status === 'play' && assignments?.every(a => a.booking_status === 'accepted')) {
    console.log('\n⚠️  PROBLEME DETECTE:');
    console.log('Le projet est en status "play" mais devrait être en "attente-team"');
    console.log('Un projet ne devrait passer en "play" qu\'après le kickoff');
  }
}

checkProject();
