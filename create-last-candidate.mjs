import fetch from 'node-fetch';

const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

async function createProfile() {
  const candidateId = '3983b196-1ec2-4368-a06f-b0c7b4bf4b81';
  
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
        console.log('\n⚠️  L\'ONBOARDING VA SE DÉCLENCHER');
        console.log('👉 Rafraîchissez votre page maintenant');
      }
      if (result.profile) {
        console.log('\nProfil:');
        console.log('- Email:', result.profile.email);
        console.log('- Métier:', result.profile.profile_id || '❌ Non défini → ONBOARDING REQUIS');
        console.log('- Séniorité:', result.profile.seniority);
      }
    } else {
      console.error('❌ Erreur:', result.error);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

createProfile();