import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCandidateSkills() {
  console.log('=== CORRECTION DES COMPÉTENCES DU CANDIDAT ===\n');
  
  const candidateId = '7f24d9c5-54eb-4185-815b-79daf6cdf4da';
  const candidateEmail = 'fmeleard+new_cdp_id4@gmail.com';
  
  // 1. Vérifier les compétences actuelles
  console.log('1. COMPÉTENCES ACTUELLES:');
  
  // Langues
  const { data: currentLangs } = await supabase
    .from('candidate_languages')
    .select(`
      language_id,
      hr_languages (name)
    `)
    .eq('candidate_id', candidateId);
    
  console.log('\nLangues actuelles:');
  if (currentLangs && currentLangs.length > 0) {
    currentLangs.forEach(l => {
      console.log(`  - ${l.hr_languages?.name}`);
    });
  } else {
    console.log('  ❌ Aucune langue');
  }
  
  // Expertises
  const { data: currentExps } = await supabase
    .from('candidate_expertises')
    .select(`
      expertise_id,
      hr_expertises (name)
    `)
    .eq('candidate_id', candidateId);
    
  console.log('\nExpertises actuelles:');
  if (currentExps && currentExps.length > 0) {
    currentExps.forEach(e => {
      console.log(`  - ${e.hr_expertises?.name}`);
    });
  } else {
    console.log('  ❌ Aucune expertise');
  }
  
  // 2. Vérifier ce qui est requis par les projets
  console.log('\n\n2. COMPÉTENCES REQUISES PAR LES PROJETS:');
  
  const { data: assignments } = await supabase
    .from('hr_resource_assignments')
    .select('languages, expertises, projects(title)')
    .in('project_id', [
      '51a63396-3b8b-4d84-a1b5-7a730f3d4a17', // 1233
      '4ec0b104-2fef-4f3c-be22-9e504903fc75', // test1217
    ]);
    
  if (assignments) {
    assignments.forEach(a => {
      console.log(`\nProjet "${a.projects?.title}":`);
      console.log(`  - Langues requises: ${a.languages?.join(', ') || 'Aucune'}`);
      console.log(`  - Expertises requises: ${a.expertises?.join(', ') || 'Aucune'}`);
    });
  }
  
  // 3. Ajouter les compétences manquantes
  console.log('\n\n3. AJOUT DES COMPÉTENCES MANQUANTES:');
  
  // Récupérer les IDs des langues et expertises
  const { data: frenchLang } = await supabase
    .from('hr_languages')
    .select('id')
    .eq('name', 'Français')
    .single();
    
  const { data: agileExp } = await supabase
    .from('hr_expertises')
    .select('id')
    .eq('name', 'Agile')
    .single();
    
  // Ajouter Français si manquant
  if (frenchLang && !currentLangs?.some(l => l.hr_languages?.name === 'Français')) {
    const { error } = await supabase
      .from('candidate_languages')
      .insert({
        candidate_id: candidateId,
        language_id: frenchLang.id
      });
      
    if (error) {
      console.log(`  ❌ Erreur ajout Français: ${error.message}`);
    } else {
      console.log('  ✅ Français ajouté');
    }
  } else {
    console.log('  ℹ️ Français déjà présent');
  }
  
  // Ajouter Agile si manquant
  if (agileExp && !currentExps?.some(e => e.hr_expertises?.name === 'Agile')) {
    const { error } = await supabase
      .from('candidate_expertises')
      .insert({
        candidate_id: candidateId,
        expertise_id: agileExp.id
      });
      
    if (error) {
      console.log(`  ❌ Erreur ajout Agile: ${error.message}`);
    } else {
      console.log('  ✅ Agile ajouté');
    }
  } else {
    console.log('  ℹ️ Agile déjà présent');
  }
  
  // 4. Vérifier les compétences finales
  console.log('\n\n4. COMPÉTENCES FINALES:');
  
  const { data: finalLangs } = await supabase
    .from('candidate_languages')
    .select('hr_languages(name)')
    .eq('candidate_id', candidateId);
    
  const { data: finalExps } = await supabase
    .from('candidate_expertises')
    .select('hr_expertises(name)')
    .eq('candidate_id', candidateId);
    
  console.log('\nLangues:');
  finalLangs?.forEach(l => console.log(`  - ${l.hr_languages?.name}`));
  
  console.log('\nExpertises:');
  finalExps?.forEach(e => console.log(`  - ${e.hr_expertises?.name}`));
  
  console.log('\n\n✅ Les compétences ont été ajustées.');
  console.log('Le candidat devrait maintenant voir les projets 1233 et test1217 !');
  
  process.exit(0);
}

fixCandidateSkills().catch(console.error);