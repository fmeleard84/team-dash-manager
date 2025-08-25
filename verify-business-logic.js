import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIyNDkyMjUsImV4cCI6MjAzNzgyNTIyNX0.4BRPKfKdLSi_6VuVVYscYQY7JajN4CJvPaOhNHPKyhM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyBusinessLogic() {
  console.log('🔍 VÉRIFICATION DE LA LOGIQUE MÉTIER');
  console.log('=====================================\n');
  
  // 1. Récupérer tous les projets avec status 'recherche'
  const { data: searchingAssignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects!inner (
        id,
        title,
        status
      ),
      hr_profiles!inner (
        name
      )
    `)
    .in('booking_status', ['recherche', 'draft']);
  
  console.log(`📋 Projets en recherche de ressources: ${searchingAssignments?.length || 0}\n`);
  
  // Grouper par projet
  const projectGroups = {};
  searchingAssignments?.forEach(assignment => {
    const projectId = assignment.project_id;
    if (!projectGroups[projectId]) {
      projectGroups[projectId] = {
        title: assignment.projects.title,
        assignments: []
      };
    }
    projectGroups[projectId].assignments.push(assignment);
  });
  
  // Pour chaque projet, vérifier combien de candidats peuvent recevoir la demande
  for (const [projectId, project] of Object.entries(projectGroups)) {
    console.log(`\n📁 PROJET: ${project.title}`);
    console.log(`   ID: ${projectId}`);
    console.log(`   Postes recherchés: ${project.assignments.length}`);
    
    for (const assignment of project.assignments) {
      console.log(`\n   🔍 Poste: ${assignment.hr_profiles.name}`);
      console.log(`      - Séniorité: ${assignment.seniority}`);
      console.log(`      - Langues requises: ${assignment.languages?.join(', ') || 'Aucune'}`);
      console.log(`      - Expertises requises: ${assignment.expertises?.join(', ') || 'Aucune'}`);
      console.log(`      - Statut: ${assignment.booking_status}`);
      console.log(`      - Candidat assigné: ${assignment.candidate_id || 'AUCUN'}`);
      
      // Compter les candidats éligibles
      let query = supabase
        .from('candidate_profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          status,
          candidate_languages (
            hr_languages (name)
          ),
          candidate_expertises (
            hr_expertises (name)
          )
        `)
        .eq('profile_id', assignment.profile_id)
        .eq('seniority', assignment.seniority)
        .eq('status', 'disponible');
      
      const { data: eligibleCandidates } = await query;
      
      // Filtrer par langues et expertises
      const qualifiedCandidates = eligibleCandidates?.filter(candidate => {
        const candidateLanguages = candidate.candidate_languages?.map(cl => cl.hr_languages?.name) || [];
        const candidateExpertises = candidate.candidate_expertises?.map(ce => ce.hr_expertises?.name) || [];
        
        const hasLanguages = !assignment.languages || assignment.languages.length === 0 ||
          assignment.languages.every(lang => candidateLanguages.includes(lang));
        
        const hasExpertises = !assignment.expertises || assignment.expertises.length === 0 ||
          assignment.expertises.every(exp => candidateExpertises.includes(exp));
        
        return hasLanguages && hasExpertises;
      }) || [];
      
      console.log(`      ✅ Candidats éligibles: ${qualifiedCandidates.length}`);
      
      if (qualifiedCandidates.length > 0 && qualifiedCandidates.length <= 5) {
        qualifiedCandidates.forEach(c => {
          console.log(`         - ${c.email} (${c.first_name} ${c.last_name})`);
        });
      }
      
      // Vérifier si déjà assigné
      if (assignment.candidate_id) {
        const assigned = eligibleCandidates?.find(c => c.id === assignment.candidate_id);
        if (assigned) {
          console.log(`      ⚠️  DÉJÀ ASSIGNÉ À: ${assigned.email}`);
        }
      } else {
        console.log(`      📨 Ce poste devrait être visible pour ces ${qualifiedCandidates.length} candidats`);
      }
    }
  }
  
  console.log('\n=====================================');
  console.log('📊 RÉSUMÉ DE LA LOGIQUE MÉTIER:\n');
  console.log('✅ Règle 1: Filtrage exact sur métier + séniorité');
  console.log('✅ Règle 2: Candidat doit avoir AU MOINS les langues requises');
  console.log('✅ Règle 3: Candidat doit avoir AU MOINS les expertises requises');
  console.log('✅ Règle 4: Candidat doit être disponible');
  console.log('✅ Règle 5: Premier qui accepte bloque le poste pour les autres');
  console.log('✅ Règle 6: Un poste avec candidate_id != null n\'est plus visible pour les autres');
  
  // Vérifier spécifiquement pour notre candidat test
  console.log('\n=====================================');
  console.log('🔍 TEST POUR fmeleard+ressource_2@gmail.com:\n');
  
  const { data: testCandidate } = await supabase
    .from('candidate_profiles')
    .select(`
      *,
      hr_profiles (name),
      candidate_languages (hr_languages(name)),
      candidate_expertises (hr_expertises(name))
    `)
    .eq('email', 'fmeleard+ressource_2@gmail.com')
    .single();
  
  if (testCandidate) {
    console.log('Profil:', testCandidate.hr_profiles?.name);
    console.log('Séniorité:', testCandidate.seniority);
    console.log('Statut:', testCandidate.status);
    console.log('Langues:', testCandidate.candidate_languages?.map(cl => cl.hr_languages?.name).join(', '));
    console.log('Expertises:', testCandidate.candidate_expertises?.map(ce => ce.hr_expertises?.name).join(', '));
    
    // Trouver les missions qu'il devrait voir
    const { data: shouldSee } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        projects (title)
      `)
      .eq('profile_id', testCandidate.profile_id)
      .eq('seniority', testCandidate.seniority)
      .in('booking_status', ['recherche', 'draft'])
      .is('candidate_id', null);
    
    console.log(`\nMissions qu'il DEVRAIT voir (non assignées): ${shouldSee?.length || 0}`);
    shouldSee?.forEach(a => {
      console.log(`  - ${a.projects?.title}`);
    });
    
    // Missions déjà assignées à lui
    const { data: assigned } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        projects (title)
      `)
      .eq('candidate_id', testCandidate.id)
      .in('booking_status', ['accepted', 'booké']);
    
    console.log(`\nMissions ACCEPTÉES par lui: ${assigned?.length || 0}`);
    assigned?.forEach(a => {
      console.log(`  - ${a.projects?.title}`);
    });
  }
}

verifyBusinessLogic().catch(console.error);