import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIzNDQ4NTcsImV4cCI6MjAzNzkyMDg1N30.LT_ktw4P0bJrvacVzRcH0VIHzR7u4Q3vTnJYC6jlFr4';

async function checkUserQualification() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const email = 'fmeleard+ressource_7@gmail.com';
  
  console.log(`\n=== Vérification du candidat: ${email} ===\n`);
  
  // 1. Récupérer le profil candidat
  const { data: candidate, error: candidateError } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('email', email)
    .single();
    
  if (candidateError) {
    console.error('Erreur récupération candidat:', candidateError);
    return;
  }
  
  console.log('📋 Profil candidat trouvé:');
  console.log('  - ID:', candidate.id);
  console.log('  - Nom:', candidate.first_name, candidate.last_name);
  console.log('  - Téléphone:', candidate.phone || '(non renseigné)');
  console.log('  - Statut qualification:', candidate.qualification_status);
  console.log('  - Étape onboarding:', candidate.onboarding_step);
  
  // 2. Vérifier les résultats de qualification
  const { data: qualificationResults, error: qualError } = await supabase
    .from('candidate_qualification_results')
    .select('*')
    .eq('candidate_id', candidate.id);
    
  if (qualError) {
    console.error('Erreur récupération résultats:', qualError);
  } else if (qualificationResults && qualificationResults.length > 0) {
    console.log('\n✅ Résultats de qualification trouvés:');
    qualificationResults.forEach((result, index) => {
      console.log(`  Résultat ${index + 1}:`);
      console.log(`    - Score: ${result.score}/100`);
      console.log(`    - Statut: ${result.qualification_status}`);
      console.log(`    - Date: ${new Date(result.created_at).toLocaleDateString('fr-FR')}`);
      console.log(`    - Nombre de réponses: ${Object.keys(result.test_answers || {}).length}`);
    });
  } else {
    console.log('\n❌ Aucun résultat de qualification trouvé');
    console.log('   Les résultats du test n\'ont pas été sauvegardés en base.');
  }
  
  // 3. Vérifier les langues
  const { data: languages } = await supabase
    .from('candidate_languages')
    .select(`
      hr_languages (
        name
      )
    `)
    .eq('candidate_id', candidate.id);
    
  if (languages && languages.length > 0) {
    console.log('\n🌍 Langues du candidat:');
    languages.forEach(lang => {
      console.log(`  - ${lang.hr_languages?.name}`);
    });
  }
  
  // 4. Vérifier les expertises
  const { data: expertises } = await supabase
    .from('candidate_expertises')
    .select(`
      hr_expertises (
        name
      )
    `)
    .eq('candidate_id', candidate.id);
    
  if (expertises && expertises.length > 0) {
    console.log('\n💼 Expertises du candidat:');
    expertises.forEach(exp => {
      console.log(`  - ${exp.hr_expertises?.name}`);
    });
  }
}

checkUserQualification().catch(console.error);