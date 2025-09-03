import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRealAcceptance() {
  try {
    // Récupérer un candidat réel avec ses assignments
    const candidateEmail = 'fmeleard+ressource@gmail.com'; // Un des candidats de la liste
    
    // Chercher les assignments pour ce candidat
    const { data: candidate } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('email', candidateEmail)
      .single();
    
    console.log('Candidat trouvé:', {
      id: candidate?.id,
      email: candidate?.email,
      profile_id: candidate?.profile_id,
      seniority: candidate?.seniority
    });
    
    // Chercher les assignments correspondants
    const { data: assignments } = await supabase
      .from('hr_resource_assignments')
      .select('*, projects(*)')
      .or(`candidate_id.eq.${candidate?.id},and(profile_id.eq.${candidate?.profile_id},seniority.eq.${candidate?.seniority},booking_status.eq.recherche)`);
    
    console.log('\nAssignments trouvés:', assignments?.length);
    
    if (assignments && assignments.length > 0) {
      const firstAssignment = assignments.find(a => a.booking_status === 'recherche');
      if (firstAssignment) {
        console.log('\nAssignment à accepter:', {
          id: firstAssignment.id,
          project_title: firstAssignment.projects?.title,
          booking_status: firstAssignment.booking_status,
          profile_id: firstAssignment.profile_id,
          seniority: firstAssignment.seniority
        });
        
        // Tester l'acceptation
        console.log('\n--- Test acceptation ---');
        const { data, error } = await supabase.functions.invoke('resource-booking', {
          body: {
            action: 'accept_mission',
            assignment_id: firstAssignment.id,
            candidate_email: candidateEmail
          }
        });
        
        if (error) {
          console.error('Erreur:', error);
          // Essayer de récupérer plus de détails
          if (error.context) {
            console.error('Context:', error.context);
          }
        } else {
          console.log('Succès:', data);
        }
      } else {
        console.log('Pas d\'assignment en recherche trouvé');
      }
    }
    
  } catch (error) {
    console.error('Erreur test:', error);
  }
}

testRealAcceptance();