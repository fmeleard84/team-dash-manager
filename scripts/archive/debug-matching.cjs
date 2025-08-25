const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
);

async function debugMatching() {
  console.log('🔍 Debug matching candidat/assignments');
  const candidateId = 'ffff89c3-ecc7-4a19-b295-1e5904417777';
  
  // 1. Profil candidat
  const { data: candidate } = await supabase
    .from('candidate_profiles')
    .select('id, email, profile_id, hr_profiles(name)')
    .eq('id', candidateId)
    .maybeSingle();
    
  if (!candidate) {
    console.log('❌ Candidat non trouvé avec ID:', candidateId);
    return;
  }
  
  console.log('✅ Candidat:');
  console.log('  - ID:', candidate.id);
  console.log('  - Email:', candidate.email);
  console.log('  - Profile ID:', candidate.profile_id);
  console.log('  - Métier:', candidate.hr_profiles?.name);
  
  // 2. Tous les assignments qui correspondent au profile_id
  const { data: assignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      id,
      project_id,
      profile_id,
      booking_status,
      languages,
      expertises,
      seniority,
      projects(id, title, status),
      hr_profiles(name)
    `)
    .eq('profile_id', candidate.profile_id);
    
  console.log('\n📋 Assignments pour ce profil:', assignments?.length || 0);
  
  if (assignments && assignments.length > 0) {
    assignments.forEach((assignment, index) => {
      console.log(`\nAssignment ${index + 1}:`);
      console.log('  - Project:', assignment.projects?.title);
      console.log('  - Status projet:', assignment.projects?.status);
      console.log('  - Booking status:', assignment.booking_status);
      console.log('  - Langues requises:', assignment.languages?.join(', ') || 'Aucune');
      console.log('  - Expertises requises:', assignment.expertises?.join(', ') || 'Aucune');
      console.log('  - Séniorité:', assignment.seniority);
      
      const isAvailable = ['recherche', 'pending'].includes(assignment.booking_status);
      const isProjectActive = assignment.projects?.status === 'play';
      
      console.log('  ✨ Assignment disponible:', isAvailable ? 'OUI' : 'NON');
      console.log('  ✨ Projet actif:', isProjectActive ? 'OUI' : 'NON');
    });
  } else {
    console.log('❌ Aucun assignment trouvé pour profile_id:', candidate.profile_id);
    
    // Vérifier tous les assignments existants
    const { data: allAssignments } = await supabase
      .from('hr_resource_assignments')
      .select('id, profile_id, hr_profiles(name), booking_status')
      .limit(10);
      
    console.log('\n🔍 Tous les assignments dans la base:', allAssignments?.length || 0);
    allAssignments?.forEach(a => {
      console.log(`  - Profile: ${a.hr_profiles?.name} (${a.profile_id}) | Status: ${a.booking_status}`);
    });
  }
  
  // 3. Vérifier les langues et expertises du candidat
  const { data: languages } = await supabase
    .from('candidate_languages')
    .select('hr_languages(name)')
    .eq('candidate_id', candidateId);
    
  const { data: expertises } = await supabase
    .from('candidate_expertises')
    .select('hr_expertises(name)')
    .eq('candidate_id', candidateId);
    
  const languageNames = languages?.map(l => l.hr_languages?.name).filter(Boolean) || [];
  const expertiseNames = expertises?.map(e => e.hr_expertises?.name).filter(Boolean) || [];
  
  console.log('\n👤 Compétences candidat:');
  console.log('  - Langues:', languageNames.join(', '));
  console.log('  - Expertises:', expertiseNames.join(', '));
}

debugMatching().catch(console.error);