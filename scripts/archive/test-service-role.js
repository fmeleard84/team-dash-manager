import { createClient } from '@supabase/supabase-js';

// Service role pour bypass RLS
const serviceClient = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.hJfYoZR5hzx1N31oUeQNJTZNt5iO9kI56JhE_VlOsO8'
);

async function testServiceRoleQuery() {
  console.log('🔍 Test avec SERVICE ROLE - Simulation du hook candidat');
  
  const marketingProfileId = '922efb64-1684-45ec-8aea-436c4dad2f37';
  
  try {
    // La même requête que dans useCandidateProjects.ts mais avec service role
    const { data: availableAssignments, error: assignmentsError } = await serviceClient
      .from('hr_resource_assignments')
      .select(`
        project_id,
        booking_status,
        languages,
        expertises,
        seniority,
        projects (
          id,
          title,
          description,
          status,
          project_date,
          due_date,
          client_budget
        )
      `)
      .eq('profile_id', marketingProfileId)
      .in('booking_status', ['recherche', 'pending']);

    console.log('✅ Assignments trouvés avec SERVICE ROLE:', availableAssignments?.length || 0);
    console.log('❌ Erreur:', assignmentsError);
    
    if (availableAssignments && availableAssignments.length > 0) {
      console.log('\n📋 Liste des assignments disponibles:');
      availableAssignments.forEach((assignment, index) => {
        console.log(`${index + 1}. Projet: ${assignment.projects?.title}`);
        console.log(`   Status: ${assignment.booking_status} | Projet status: ${assignment.projects?.status}`);
        console.log(`   Langues: ${assignment.languages?.join(', ') || 'Aucune'}`);
        console.log(`   Expertises: ${assignment.expertises?.join(', ') || 'Aucune'}`);
        console.log(`   Séniorité: ${assignment.seniority}`);
        console.log('');
      });
      
      // Filtrer pour voir ceux qui matchent le candidat
      const candidateLanguages = ['Anglais', 'Français'];
      const candidateExpertises = ['Content Marketing', 'Google Ads'];
      
      const matchingAssignments = availableAssignments.filter(assignment => {
        if (!assignment.projects || assignment.projects.status !== 'play') {
          return false;
        }

        const requiredLanguages = assignment.languages || [];
        const hasRequiredLanguages = requiredLanguages.every(lang => 
          candidateLanguages.includes(lang)
        );

        const requiredExpertises = assignment.expertises || [];
        const hasRequiredExpertises = requiredExpertises.every(exp => 
          candidateExpertises.includes(exp)
        );

        return hasRequiredLanguages && hasRequiredExpertises;
      });
      
      console.log('🎯 ASSIGNMENTS QUI MATCHENT LE CANDIDAT:', matchingAssignments.length);
      matchingAssignments.forEach((assignment, index) => {
        console.log(`${index + 1}. ${assignment.projects?.title} - ${assignment.booking_status}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Erreur:', error);
  }
}

testServiceRoleQuery();