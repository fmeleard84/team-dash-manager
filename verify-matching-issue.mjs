import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMatchingIssue() {
  console.log('=== VÉRIFICATION DU PROBLÈME DE MATCHING ID UNIVERSEL ===\n');
  
  // 1. Vérifier le candidat
  const candidateEmail = 'fmeleard+new_cdp_id4@gmail.com';
  const { data: candidate } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('email', candidateEmail)
    .single();
    
  if (!candidate) {
    console.log('❌ Candidat non trouvé');
    process.exit(1);
  }
  
  console.log('CANDIDAT:');
  console.log('- ID universel:', candidate.id);
  console.log('- Old ID:', candidate.old_id);
  console.log('- Profile ID (métier):', candidate.profile_id);
  console.log('- Seniority:', candidate.seniority);
  console.log('- Status:', candidate.status);
  
  // 2. Vérifier les dernières assignations créées
  console.log('\n=== DERNIÈRES ASSIGNATIONS CRÉÉES ===');
  const { data: recentAssignments } = await supabase
    .from('hr_resource_assignments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (recentAssignments && recentAssignments.length > 0) {
    recentAssignments.forEach(a => {
      console.log(`\nAssignment ID: ${a.id}`);
      console.log('- Project ID:', a.project_id);
      console.log('- Profile ID:', a.profile_id);
      console.log('- Candidate ID:', a.candidate_id);
      console.log('- Booking Status:', a.booking_status);
      console.log('- Seniority:', a.seniority);
      console.log('- Created:', a.created_at);
    });
  } else {
    console.log('❌ Aucune assignation trouvée');
  }
  
  // 3. Rechercher les assignations en recherche qui devraient matcher
  console.log('\n=== ASSIGNATIONS QUI DEVRAIENT MATCHER LE CANDIDAT ===');
  const { data: matchingAssignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects(title, status)
    `)
    .eq('booking_status', 'recherche')
    .eq('profile_id', candidate.profile_id)
    .eq('seniority', candidate.seniority);
    
  if (matchingAssignments && matchingAssignments.length > 0) {
    console.log(`\n✅ ${matchingAssignments.length} assignation(s) devraient matcher:`);
    matchingAssignments.forEach(a => {
      console.log(`\n- Projet: ${a.projects?.title}`);
      console.log('  Assignment ID:', a.id);
      console.log('  Candidate ID:', a.candidate_id || 'NULL');
      console.log('  Profile match:', a.profile_id === candidate.profile_id ? '✅' : '❌');
      console.log('  Seniority match:', a.seniority === candidate.seniority ? '✅' : '❌');
    });
  } else {
    console.log('❌ Aucune assignation ne devrait matcher ce candidat');
  }
  
  // 4. Vérifier si le problème vient de l'ID dans les skills
  console.log('\n=== VÉRIFICATION DES SKILLS DU CANDIDAT ===');
  const { data: skills } = await supabase
    .from('candidate_skills')
    .select('*')
    .eq('candidate_id', candidate.id);
    
  if (skills && skills.length > 0) {
    console.log(`✅ ${skills.length} compétences trouvées avec le bon ID universel`);
  } else {
    // Essayer avec l'ancien ID
    const { data: oldSkills } = await supabase
      .from('candidate_skills')
      .select('*')
      .eq('candidate_id', candidate.old_id || 'none');
      
    if (oldSkills && oldSkills.length > 0) {
      console.log(`⚠️ PROBLÈME: ${oldSkills.length} compétences utilisent l'ANCIEN ID !`);
      console.log('Les skills doivent être migrées vers le nouvel ID universel');
    } else {
      console.log('❌ Aucune compétence trouvée pour ce candidat');
    }
  }
  
  console.log('\n\n=== DIAGNOSTIC ===');
  console.log('Points à vérifier:');
  console.log('1. Les assignations utilisent-elles le bon profile_id ?');
  console.log('2. Le candidat a-t-il les compétences (langues/expertises) requises ?');
  console.log('3. Le matching dans CandidateDashboard utilise-t-il le bon ID ?');
  console.log('4. Les notifications sont-elles créées pour le bon candidate_id ?');
  
  process.exit(0);
}

verifyMatchingIssue().catch(console.error);