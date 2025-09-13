import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
);

console.log('🔍 Vérification du système IA...\n');

// 1. Vérifier les métiers disponibles
console.log('=== MÉTIERS DISPONIBLES ===');
const { data: profiles, error: profilesError } = await supabase
  .from('hr_profiles')
  .select('id, name, base_price')
  .order('name');

if (profilesError) {
  console.error('❌ Erreur chargement métiers:', profilesError);
} else {
  console.log(`✅ ${profiles.length} métiers trouvés:`);
  
  // Chercher spécifiquement "Chef de projet"
  const chefProjet = profiles.find(p => 
    p.name?.toLowerCase().includes('chef') || 
    p.name?.toLowerCase().includes('project')
  );
  
  if (chefProjet) {
    console.log(`  ✅ Chef de projet trouvé: ${chefProjet.name} (ID: ${chefProjet.id})`);
  } else {
    console.log('  ⚠️ "Chef de projet" non trouvé dans la base');
    console.log('  Métiers disponibles:');
    profiles.slice(0, 10).forEach(p => {
      console.log(`    - ${p.name}`);
    });
  }
}

// 2. Vérifier les expertises pour Chef de projet
if (profiles && profiles.length > 0) {
  console.log('\n=== EXPERTISES CHEF DE PROJET ===');
  
  const chefProjet = profiles.find(p => 
    p.name?.toLowerCase().includes('chef')
  );
  
  if (chefProjet) {
    // Via la table de jointure
    const { data: expertises, error: expertisesError } = await supabase
      .from('hr_profile_expertises')
      .select(`
        expertise_id,
        hr_expertises (
          id,
          name
        )
      `)
      .eq('profile_id', chefProjet.id);
    
    if (expertisesError) {
      console.error('❌ Erreur chargement expertises:', expertisesError);
    } else {
      console.log(`✅ ${expertises?.length || 0} expertises trouvées:`);
      expertises?.forEach(e => {
        if (e.hr_expertises) {
          console.log(`  - ${e.hr_expertises.name}`);
        }
      });
      
      // Vérifier si "Agile" est dans les expertises
      const hasAgile = expertises?.some(e => 
        e.hr_expertises?.name?.toLowerCase().includes('agile')
      );
      
      if (hasAgile) {
        console.log('  ✅ Expertise "Agile" disponible');
      } else {
        console.log('  ⚠️ Expertise "Agile" non trouvée');
      }
    }
  }
}

// 3. Vérifier les langues
console.log('\n=== LANGUES DISPONIBLES ===');
const { data: languages, error: languagesError } = await supabase
  .from('hr_languages')
  .select('id, name')
  .order('name');

if (languagesError) {
  console.error('❌ Erreur chargement langues:', languagesError);
} else {
  console.log(`✅ ${languages.length} langues trouvées:`);
  languages.forEach(l => {
    console.log(`  - ${l.name}`);
  });
}

// 4. Vérifier les prompts IA
console.log('\n=== PROMPTS IA ACTIFS ===');
const { data: prompts, error: promptsError } = await supabase
  .from('prompts_ia')
  .select('name, context, active')
  .eq('active', true)
  .order('priority', { ascending: false });

if (promptsError) {
  console.error('❌ Erreur chargement prompts:', promptsError);
} else {
  console.log(`✅ ${prompts.length} prompts actifs:`);
  prompts.forEach(p => {
    console.log(`  - ${p.name} (${p.context})`);
  });
}

// 5. Test de normalisation
console.log('\n=== TEST NORMALISATION SÉNIORITÉ ===');
const testSeniorities = ['junior', 'senior', 'expert', 'confirmé', 'intermediate'];
testSeniorities.forEach(s => {
  const mapping = {
    'junior': 'junior',
    'débutant': 'junior',
    'medior': 'intermediate',
    'médior': 'intermediate',
    'intermédiaire': 'intermediate',
    'intermediate': 'intermediate',
    'confirmé': 'intermediate',
    'senior': 'senior',
    'expert': 'senior',
    'principal': 'senior',
    'lead': 'senior'
  };
  
  const normalized = mapping[s.toLowerCase()] || 'intermediate';
  console.log(`  "${s}" → "${normalized}"`);
});

console.log('\n✅ Vérification terminée');