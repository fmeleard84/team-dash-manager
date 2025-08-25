import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI2NjMxNzksImV4cCI6MjAzODIzOTE3OX0.BRBQan9kOPrrtbwkm5rF50oAxE7VpL7uQ8DPfTG7TAI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAssignments() {
  console.log('🔍 Checking hr_resource_assignments...\n');
  
  // 1. Récupérer toutes les assignations
  const { data: assignments, error } = await supabase
    .from('hr_resource_assignments')
    .select('*')
    .eq('project_id', '16fd6a53-d0ed-49e9-aec6-99813eb23738');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${assignments.length} assignments for project 16fd6a53-d0ed-49e9-aec6-99813eb23738:\n`);
  
  for (const assignment of assignments) {
    console.log('Assignment:', {
      id: assignment.id,
      project_id: assignment.project_id,
      profile_id: assignment.profile_id,
      candidate_id: assignment.candidate_id,
      booking_status: assignment.booking_status
    });
    
    // Si on a un profile_id mais pas de candidate_id, c'est l'ancien système
    if (assignment.profile_id && !assignment.candidate_id) {
      console.log('⚠️  Using OLD system (profile_id)');
      
      // Vérifier si hr_profiles existe
      const { data: hrProfile } = await supabase
        .from('hr_profiles')
        .select('*')
        .eq('id', assignment.profile_id)
        .single();
      
      if (hrProfile) {
        console.log('  Found hr_profile:', {
          id: hrProfile.id,
          name: hrProfile.name,
          job_title: hrProfile.job_title,
          profile_id: hrProfile.profile_id
        });
        
        // Si hr_profile a un profile_id, on peut créer/trouver un candidate_profile
        if (hrProfile.profile_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', hrProfile.profile_id)
            .single();
          
          if (profile) {
            console.log('  Found profile:', {
              id: profile.id,
              email: profile.email,
              first_name: profile.first_name
            });
            
            // Vérifier si un candidate_profile existe déjà
            const { data: existingCandidate } = await supabase
              .from('candidate_profiles')
              .select('*')
              .eq('email', profile.email)
              .single();
            
            if (existingCandidate) {
              console.log('  ✅ Candidate profile already exists:', existingCandidate.id);
              console.log('  → Should update assignment to use candidate_id:', existingCandidate.id);
            } else {
              console.log('  ❌ No candidate profile found for email:', profile.email);
              console.log('  → Should create candidate profile');
            }
          }
        }
      } else {
        console.log('  ❌ hr_profile not found!');
      }
    }
    
    // Si on a un candidate_id, c'est le nouveau système
    if (assignment.candidate_id) {
      console.log('✅ Using NEW system (candidate_id)');
      
      const { data: candidate } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', assignment.candidate_id)
        .single();
      
      if (candidate) {
        console.log('  Found candidate:', {
          id: candidate.id,
          email: candidate.email,
          job_title: candidate.job_title
        });
      } else {
        console.log('  ❌ Candidate not found!');
      }
    }
    
    console.log('---');
  }
}

checkAssignments();