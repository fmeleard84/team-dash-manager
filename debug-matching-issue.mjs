import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugMatchingIssue() {
  console.log('=== DEBUG DU PROBLÈME DE MATCHING ===\n');
  
  const candidateId = '7f24d9c5-54eb-4185-815b-79daf6cdf4da';
  
  // 1. Récupérer les assignments comme le fait le code
  console.log('1. REQUÊTE COMME DANS LE CODE:');
  const { data: assignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects (
        id,
        title,
        description,
        status,
        project_date,
        due_date,
        client_budget,
        owner_id
      )
    `)
    .or(`candidate_id.eq.${candidateId},booking_status.eq.recherche`);
    
  console.log(`Nombre d'assignations trouvées: ${assignments?.length || 0}`);
  
  if (assignments && assignments.length > 0) {
    console.log('\n2. ANALYSE DES ASSIGNATIONS:');
    
    assignments.forEach((a, i) => {
      console.log(`\n--- Assignment ${i+1} ---`);
      console.log(`Projet: "${a.projects?.title || 'SANS PROJET'}"`);
      console.log(`Languages dans assignment: ${JSON.stringify(a.languages)}`);
      console.log(`Expertises dans assignment: ${JSON.stringify(a.expertises)}`);
      console.log(`Type languages: ${typeof a.languages}`);
      console.log(`Type expertises: ${typeof a.expertises}`);
    });
  }
  
  // 2. Récupérer les compétences du candidat EXACTEMENT comme le code
  console.log('\n\n3. COMPÉTENCES DU CANDIDAT (comme dans le code):');
  
  // Langues (comme loadCandidateSkills dans CandidateDashboard)
  const { data: langData } = await supabase
    .from('candidate_languages')
    .select(`
      hr_languages (
        name
      )
    `)
    .eq('candidate_id', candidateId);
    
  const candidateLanguages = langData ? langData.map(cl => cl.hr_languages?.name).filter(Boolean) : [];
  console.log('Langues du candidat:', candidateLanguages);
  
  // Expertises (comme loadCandidateSkills dans CandidateDashboard)
  const { data: expData } = await supabase
    .from('candidate_expertises')
    .select(`
      hr_expertises (
        name
      )
    `)
    .eq('candidate_id', candidateId);
    
  const candidateExpertises = expData ? expData.map(ce => ce.hr_expertises?.name).filter(Boolean) : [];
  console.log('Expertises du candidat:', candidateExpertises);
  
  // 3. Simuler le matching
  console.log('\n\n4. SIMULATION DU MATCHING:');
  
  if (assignments) {
    assignments.forEach(assignment => {
      console.log(`\nProjet: "${assignment.projects?.title}"`);
      
      // Test languages
      const languagesMatch = !assignment.languages?.length || 
        assignment.languages.every(lang => candidateLanguages.includes(lang));
      
      console.log(`Languages match: ${languagesMatch}`);
      console.log(`  Required: ${JSON.stringify(assignment.languages)}`);
      console.log(`  Candidate has: ${JSON.stringify(candidateLanguages)}`);
      
      if (!languagesMatch && assignment.languages?.length > 0) {
        console.log('  ❌ PROBLÈME: Le candidat n\'a pas toutes les langues requises');
        assignment.languages.forEach(lang => {
          if (!candidateLanguages.includes(lang)) {
            console.log(`     Manque: "${lang}"`);
          }
        });
      }
      
      // Test expertises
      const expertisesMatch = !assignment.expertises?.length || 
        assignment.expertises.every(exp => candidateExpertises.includes(exp));
      
      console.log(`Expertises match: ${expertisesMatch}`);
      console.log(`  Required: ${JSON.stringify(assignment.expertises)}`);
      console.log(`  Candidate has: ${JSON.stringify(candidateExpertises)}`);
      
      if (!expertisesMatch && assignment.expertises?.length > 0) {
        console.log('  ❌ PROBLÈME: Le candidat n\'a pas toutes les expertises requises');
        assignment.expertises.forEach(exp => {
          if (!candidateExpertises.includes(exp)) {
            console.log(`     Manque: "${exp}"`);
          }
        });
      }
    });
  }
  
  console.log('\n\n=== DIAGNOSTIC ===');
  console.log('Le problème est que les assignments stockent les NOMS des langues/expertises');
  console.log('mais le candidat a les NOMS aussi. Il faut vérifier la correspondance exacte.');
  
  process.exit(0);
}

debugMatchingIssue().catch(console.error);
