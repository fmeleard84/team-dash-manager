import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugProfiles() {
  console.log('🔍 Vérification des profils dans la base de données...\n');
  
  // 1. Vérifier la table profiles
  console.log('📊 Table profiles:');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, job_title, seniority, seniority_level, skills, technical_skills')
    .limit(5);
  
  if (profilesError) {
    console.log('❌ Erreur profiles:', profilesError.message);
  } else {
    console.log('✅ Profiles trouvés:', profiles?.length || 0);
    profiles?.forEach(p => {
      console.log(`  - ${p.full_name || 'Sans nom'} (${p.email || 'Sans email'})`);
      console.log(`    Job: ${p.job_title || p.role || 'Non défini'}`);
      console.log(`    Seniority: ${p.seniority || p.seniority_level || 'Non défini'}`);
    });
  }
  
  // 2. Vérifier la table candidate_profiles
  console.log('\n📊 Table candidate_profiles:');
  const { data: candidates, error: candidatesError } = await supabase
    .from('candidate_profiles')
    .select('id, user_id, job_title, seniority_level, technical_skills')
    .limit(5);
  
  if (candidatesError) {
    console.log('❌ Erreur candidate_profiles:', candidatesError.message);
  } else {
    console.log('✅ Candidate profiles trouvés:', candidates?.length || 0);
    candidates?.forEach(c => {
      console.log(`  - User ID: ${c.user_id}`);
      console.log(`    Job: ${c.job_title || 'Non défini'}`);
      console.log(`    Seniority: ${c.seniority_level || 'Non défini'}`);
    });
  }
  
  // 3. Vérifier la table hr_profiles
  console.log('\n📊 Table hr_profiles:');
  const { data: hrProfiles, error: hrError } = await supabase
    .from('hr_profiles')
    .select('id, user_id, job_title, seniority_level, skills')
    .limit(5);
  
  if (hrError) {
    console.log('❌ Erreur hr_profiles:', hrError.message);
  } else {
    console.log('✅ HR profiles trouvés:', hrProfiles?.length || 0);
    hrProfiles?.forEach(h => {
      console.log(`  - User ID: ${h.user_id}`);
      console.log(`    Job: ${h.job_title || 'Non défini'}`);
      console.log(`    Seniority: ${h.seniority_level || 'Non défini'}`);
    });
  }
  
  // 4. Rechercher spécifiquement un profil marketing
  console.log('\n🔎 Recherche de profils marketing:');
  const { data: marketingProfiles, error: marketingError } = await supabase
    .from('profiles')
    .select('*')
    .or('job_title.ilike.%marketing%,role.ilike.%marketing%,job_title.ilike.%directeur%')
    .limit(5);
  
  if (marketingError) {
    console.log('❌ Erreur recherche marketing:', marketingError.message);
  } else {
    console.log('✅ Profils marketing trouvés:', marketingProfiles?.length || 0);
    marketingProfiles?.forEach(m => {
      console.log(`\n  👤 ${m.full_name || m.email || 'Utilisateur'}`);
      console.log(`     ID: ${m.id}`);
      console.log(`     Job: ${m.job_title || m.role}`);
      console.log(`     Seniority: ${m.seniority || m.seniority_level}`);
      console.log(`     Skills: ${m.skills || m.technical_skills || 'Non défini'}`);
    });
  }
  
  process.exit(0);
}

debugProfiles().catch(console.error);