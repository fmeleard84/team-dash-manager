import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIyNDkyMjUsImV4cCI6MjAzNzgyNTIyNX0.Uy3bOGD5C3-Q1Ggaod8Y1FJBQqEQtcv4qx4o2eSasXE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCandidateAssignments() {
  console.log('🔍 Vérification des assignments candidat...\n');
  
  try {
    // Login as the candidate
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'fmeleard+ressource_2@gmail.com',
      password: 'Kd@081224Kd@081224'
    });

    if (authError) {
      console.error('❌ Erreur auth:', authError);
      return;
    }

    console.log('✅ Connecté en tant que candidat');

    // Get candidate profile
    const { data: candidateProfile, error: profileError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('email', 'fmeleard+ressource_2@gmail.com')
      .single();

    if (profileError) {
      console.error('❌ Erreur profil:', profileError);
      return;
    }

    console.log('\n📋 Profil candidat:');
    console.log('- ID:', candidateProfile.id);
    console.log('- Profile ID:', candidateProfile.profile_id);
    console.log('- Seniority:', candidateProfile.seniority);

    // Check assignments with candidate_id
    const { data: assignmentsWithCandidate, error: error1 } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        projects (
          id,
          title,
          status
        )
      `)
      .eq('candidate_id', candidateProfile.id);

    console.log('\n🎯 Assignments avec candidate_id =', candidateProfile.id, ':');
    if (assignmentsWithCandidate && assignmentsWithCandidate.length > 0) {
      assignmentsWithCandidate.forEach(a => {
        console.log(`  - ${a.projects?.title} (status: ${a.projects?.status}, booking: ${a.booking_status})`);
      });
    } else {
      console.log('  Aucun assignment trouvé avec candidate_id');
    }

    // Check assignments with profile_id/seniority
    const { data: assignmentsByProfile, error: error2 } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        projects (
          id,
          title,
          status
        )
      `)
      .eq('profile_id', candidateProfile.profile_id)
      .eq('seniority', candidateProfile.seniority);

    console.log('\n📊 Assignments avec profile_id/seniority:');
    if (assignmentsByProfile && assignmentsByProfile.length > 0) {
      assignmentsByProfile.forEach(a => {
        console.log(`  - ${a.projects?.title} (status: ${a.projects?.status}, booking: ${a.booking_status}, candidate_id: ${a.candidate_id})`);
      });
    } else {
      console.log('  Aucun assignment trouvé avec profile_id/seniority');
    }

    // Check kanban boards
    const { data: acceptedProjects } = await supabase
      .from('hr_resource_assignments')
      .select('project_id')
      .eq('candidate_id', candidateProfile.id)
      .eq('booking_status', 'accepted');

    if (acceptedProjects && acceptedProjects.length > 0) {
      console.log('\n📋 Vérification des Kanban boards:');
      for (const p of acceptedProjects) {
        const { data: board } = await supabase
          .from('kanban_boards')
          .select('id, title')
          .eq('project_id', p.project_id)
          .single();
        
        if (board) {
          console.log(`  ✅ Board trouvé pour projet ${p.project_id}: ${board.title}`);
        } else {
          console.log(`  ❌ Aucun board pour projet ${p.project_id}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkCandidateAssignments().catch(console.error);