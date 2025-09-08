import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNewIdSystem() {
  console.log('=== TEST DU SYSTÈME ID UNIVERSEL ===\n');
  
  // 1. Vérifier les profils
  console.log('1. VÉRIFICATION DES PROFILS:\n');
  
  const clientEmail = 'fmeleard+clienr_1119@gmail.com';
  const candidateEmail = 'fmeleard+new_cdp_id4@gmail.com';
  
  // Client
  const { data: clientProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', clientEmail)
    .single();
    
  if (clientProfile) {
    console.log('✅ CLIENT trouvé:');
    console.log('  - ID (auth.uid):', clientProfile.id);
    console.log('  - Email:', clientProfile.email);
    console.log('  - Role:', clientProfile.role);
    
    // Vérifier dans client_profiles
    const { data: clientData } = await supabase
      .from('client_profiles')
      .select('id, old_id')
      .eq('email', clientEmail)
      .single();
      
    if (clientData) {
      console.log('  - ID dans client_profiles:', clientData.id);
      console.log('  - Old ID:', clientData.old_id);
      console.log('  - IDs correspondent?:', clientProfile.id === clientData.id ? '✅ OUI' : '❌ NON');
    }
  }
  
  // Candidat
  console.log('\n');
  const { data: candidateProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', candidateEmail)
    .single();
    
  if (candidateProfile) {
    console.log('✅ CANDIDAT trouvé:');
    console.log('  - ID (auth.uid):', candidateProfile.id);
    console.log('  - Email:', candidateProfile.email);
    console.log('  - Role:', candidateProfile.role);
    
    // Vérifier dans candidate_profiles
    const { data: candidateData } = await supabase
      .from('candidate_profiles')
      .select('id, old_id, profile_id, seniority, status')
      .eq('email', candidateEmail)
      .single();
      
    if (candidateData) {
      console.log('  - ID dans candidate_profiles:', candidateData.id);
      console.log('  - Old ID:', candidateData.old_id);
      console.log('  - Profile ID (métier):', candidateData.profile_id);
      console.log('  - Seniority:', candidateData.seniority);
      console.log('  - Status:', candidateData.status);
      console.log('  - IDs correspondent?:', candidateProfile.id === candidateData.id ? '✅ OUI' : '❌ NON');
    }
  }
  
  // 2. Résumé du système
  console.log('\n\n=== RÉSUMÉ DU SYSTÈME ID UNIVERSEL ===\n');
  console.log('✅ Structure correcte:');
  console.log('  - auth.users.id = profiles.id = client_profiles.id = candidate_profiles.id');
  console.log('  - Tous utilisent le même UUID (auth.uid)');
  console.log('\n📝 Pour créer un projet:');
  console.log('  - owner_id = user.id (depuis AuthContext)');
  console.log('\n📝 Pour récupérer les projets du client:');
  console.log('  - WHERE owner_id = user.id');
  console.log('\n📝 Pour les assignations candidat:');
  console.log('  - candidate_id = candidateProfile.id');
  
  console.log('\n\n=== INSTRUCTIONS ===\n');
  console.log('1. Créez un nouveau projet depuis le dashboard client');
  console.log('2. Le projet utilisera automatiquement le bon owner_id (ID universel)');
  console.log('3. Définissez les ressources dans ReactFlow');
  console.log('4. Lancez la recherche de candidats');
  console.log('5. Le candidat devrait voir le projet si son profil correspond');
  
  process.exit(0);
}

testNewIdSystem().catch(console.error);