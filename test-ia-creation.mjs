import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
);

console.log('🧪 Test de création d\'équipe avec Chef de projet senior agile\n');

// Importer les modules locaux
import { expertiseProvider } from './src/ai-assistant/tools/expertise-provider.ts';

// Charger les données
await expertiseProvider.loadData();

// Test 1: Vérifier que "Chef de projet" existe
console.log('=== TEST 1: Recherche "Chef de projet" ===');
const chefProjet = expertiseProvider.findProfile('Chef de projet');
if (chefProjet) {
  console.log(`✅ Trouvé: ${chefProjet.name} (ID: ${chefProjet.id})`);
  
  // Récupérer les expertises
  const expertises = expertiseProvider.getExpertises(chefProjet.id);
  console.log(`   Expertises disponibles: ${expertises.map(e => e.name).join(', ')}`);
  
  // Vérifier si Agile est dans les expertises
  const agileExpertise = expertiseProvider.findExpertise(chefProjet.id, 'Agile');
  if (agileExpertise) {
    console.log(`   ✅ Expertise "Agile" trouvée`);
  }
} else {
  console.log('❌ "Chef de projet" non trouvé');
}

// Test 2: Normalisation de la séniorité
console.log('\n=== TEST 2: Normalisation séniorité ===');
const seniority = expertiseProvider.normalizeSeniority('senior');
console.log(`"senior" → "${seniority}"`);

// Test 3: Validation d'un profil complet
console.log('\n=== TEST 3: Validation profil complet ===');
const validation = expertiseProvider.validateProfile({
  profession: 'Chef de projet',
  seniority: 'senior',
  languages: ['Français', 'Anglais'],
  expertises: ['Agile', 'Scrum']
});

console.log(`Valide: ${validation.valid}`);
if (validation.valid) {
  console.log(`✅ Profil: ${validation.profile?.name}`);
  console.log(`✅ Séniorité: ${validation.normalizedSeniority}`);
  console.log(`✅ Langues: ${validation.validLanguages?.map(l => l.name).join(', ')}`);
  console.log(`✅ Expertises: ${validation.validExpertises?.map(e => e.name).join(', ')}`);
} else {
  console.log(`❌ Erreurs: ${validation.errors.join(', ')}`);
  if (validation.suggestions) {
    console.log('Suggestions:', validation.suggestions);
  }
}

// Test 4: Simulation de création via l'IA
console.log('\n=== TEST 4: Simulation création équipe ===');
const teamParams = {
  project_name: 'Test IA Project',
  project_description: 'Projet de test pour l\'assistant IA',
  profiles: [
    {
      profession: 'Chef de projet',
      seniority: 'senior',
      skills: ['Agile', 'Scrum'],
      languages: ['Français', 'Anglais']
    }
  ]
};

console.log('Paramètres envoyés par l\'IA:');
console.log(JSON.stringify(teamParams, null, 2));

// Valider chaque profil
for (const profile of teamParams.profiles) {
  const validation = expertiseProvider.validateProfile(profile);
  if (validation.valid) {
    console.log(`\n✅ Profil "${profile.profession}" validé avec succès:`);
    console.log(`   - Métier: ${validation.profile?.name}`);
    console.log(`   - Séniorité normalisée: ${validation.normalizedSeniority}`);
    console.log(`   - Langues validées: ${validation.validLanguages?.map(l => l.name).join(', ')}`);
    console.log(`   - Expertises validées: ${validation.validExpertises?.map(e => e.name).join(', ')}`);
  } else {
    console.log(`\n❌ Profil "${profile.profession}" invalide:`);
    console.log(`   Erreurs: ${validation.errors.join(', ')}`);
  }
}

console.log('\n✅ Tests terminés');