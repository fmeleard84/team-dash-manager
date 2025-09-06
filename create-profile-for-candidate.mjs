import fetch from 'node-fetch';

const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

async function createProfile() {
  const candidateId = '24bfe2a7-a586-4c2d-969d-23ce478d007e';
  
  try {
    console.log(`\n🔧 Création du profil pour le candidat ${candidateId}...\n`);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-candidate-profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ candidateId })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅', result.message);
      if (result.needsOnboarding) {
        console.log('\n⚠️  L\'onboarding est nécessaire pour ce candidat');
        console.log('Rafraîchissez votre page pour voir l\'onboarding');
      }
      if (result.profile) {
        console.log('\nProfil créé/trouvé:');
        console.log('- Email:', result.profile.email);
        console.log('- Statut:', result.profile.status);
        console.log('- Qualification:', result.profile.qualification_status);
        console.log('- Métier:', result.profile.profile_id || 'Non défini (onboarding requis)');
        console.log('- Séniorité:', result.profile.seniority || 'Non défini (onboarding requis)');
      }
    } else {
      console.error('❌ Erreur:', result.error);
      console.error('Détails:', result.details);
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'appel:', error.message);
  }
}

createProfile();