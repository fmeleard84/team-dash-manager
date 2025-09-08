import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllProfiles() {
  console.log('=== VÉRIFICATION DES PROFILS ===\n');
  
  // 1. Candidat
  const candidateEmail = 'fmeleard+new_cdp_id4@gmail.com';
  console.log(`1. CANDIDAT ${candidateEmail}:`);
  
  const { data: candidate } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('email', candidateEmail)
    .single();
    
  if (candidate) {
    console.log('✅ Candidat trouvé:');
    console.log('   - ID universel:', candidate.id);
    console.log('   - Profile ID:', candidate.profile_id);
    console.log('   - Seniority:', candidate.seniority);
    console.log('   - Status:', candidate.status);
  } else {
    console.log('❌ Candidat non trouvé');
  }
  
  // 2. Client avec typo
  const clientEmailTypo = 'fmeleard+clienr_1119@gmail.com';
  console.log(`\n2. CLIENT (avec typo) ${clientEmailTypo}:`);
  
  const { data: clientTypo } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('email', clientEmailTypo)
    .single();
    
  if (clientTypo) {
    console.log('✅ Client trouvé');
  } else {
    console.log('❌ Client non trouvé');
  }
  
  // 3. Client corrigé
  const clientEmailCorrect = 'fmeleard+client_1119@gmail.com';
  console.log(`\n3. CLIENT (corrigé) ${clientEmailCorrect}:`);
  
  const { data: clientCorrect } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('email', clientEmailCorrect)
    .single();
    
  if (clientCorrect) {
    console.log('✅ Client trouvé:');
    console.log('   - ID universel:', clientCorrect.id);
    console.log('   - Company:', clientCorrect.company_name);
  } else {
    console.log('❌ Client non trouvé');
  }
  
  // 4. Recherche par pattern
  console.log('\n4. RECHERCHE PAR PATTERN "fmeleard+cli"');
  
  const { data: allClients } = await supabase
    .from('client_profiles')
    .select('*')
    .like('email', 'fmeleard+cli%');
    
  if (allClients && allClients.length > 0) {
    console.log(`✅ ${allClients.length} client(s) trouvé(s):`);
    allClients.forEach(c => {
      console.log(`   - ${c.email} (ID: ${c.id})`);
    });
  } else {
    console.log('❌ Aucun client trouvé avec ce pattern');
  }
  
  // 5. Tous les profils récents
  console.log('\n5. PROFILS CRÉÉS RÉCEMMENT (auth.users):');
  
  const { data: recentProfiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (recentProfiles && recentProfiles.length > 0) {
    console.log(`✅ ${recentProfiles.length} profil(s) récent(s):`);
    recentProfiles.forEach(p => {
      console.log(`   - ${p.email} (Type: ${p.user_type}, ID: ${p.id})`);
    });
  }
  
  // 6. Projets avec owner_id existants
  console.log('\n6. PROJETS EXISTANTS AVEC OWNER VALIDE:');
  
  const { data: validProjects } = await supabase
    .from('projects')
    .select(`
      *,
      client_profiles!inner(email)
    `)
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (validProjects && validProjects.length > 0) {
    console.log(`✅ ${validProjects.length} projet(s) avec owner valide:`);
    validProjects.forEach(p => {
      console.log(`   - ${p.title} par ${p.client_profiles.email}`);
    });
  } else {
    console.log('❌ Aucun projet avec owner valide');
  }
  
  process.exit(0);
}

checkAllProfiles().catch(console.error);