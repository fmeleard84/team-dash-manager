import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Connexion avec un utilisateur admin pour avoir accès aux données
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'fmeleard@pm.me',
  password: 'Fanny2024!'
});

if (authError) {
  console.error('Erreur auth:', authError);
  process.exit(1);
}

console.log('✅ Connecté en tant que:', authData.user.email);

// Rechercher le projet "ddd"
const { data: projects } = await supabase
  .from('projects')
  .select('*')
  .or('name.ilike.%ddd%,name.ilike.%43fccfa0%')
  .order('created_at', { ascending: false });

console.log('\n📋 Projets trouvés:', projects?.length || 0);

const dddProject = projects?.find(p =>
  p.id === '43fccfa0-1bda-4bf5-9591-5ff0024312c3' ||
  p.name?.toLowerCase().includes('ddd')
);

if (!dddProject) {
  console.log('❌ Projet "ddd" non trouvé');
  process.exit(1);
}

console.log('\n🎯 Analyse du projet:', dddProject.name);
console.log('  ID:', dddProject.id);
console.log('  Status:', dddProject.status);
console.log('  Created:', new Date(dddProject.created_at).toLocaleString());

// Récupérer les ressources du projet
const { data: resources } = await supabase
  .from('hr_resource_assignments')
  .select(`
    *,
    hr_profiles!profile_id (
      id,
      name,
      is_ai,
      category_id
    )
  `)
  .eq('project_id', dddProject.id);

console.log('\n📊 Ressources du projet:', resources?.length || 0);

if (resources) {
  for (const resource of resources) {
    const profile = resource.hr_profiles;
    console.log('\n  🔍 Ressource:', resource.id);
    console.log('    📌 Profile:', profile?.name || 'Unknown');
    console.log('    🤖 Is AI (from profile):', profile?.is_ai || false);
    console.log('    📋 Booking Status:', resource.booking_status);
    console.log('    💾 Node Data:', JSON.stringify(resource.node_data, null, 2));

    // Analyse du node_data
    if (resource.node_data) {
      console.log('    🔎 Node Data Analysis:');
      console.log('      - is_ai:', resource.node_data.is_ai);
      console.log('      - is_team_member:', resource.node_data.is_team_member);
      console.log('      - profileName:', resource.node_data.profileName);
    }

    // Vérification de cohérence
    const shouldBeBooked = profile?.is_ai || resource.node_data?.is_ai;
    const isCorrectlyBooked = resource.booking_status === 'booké';

    if (shouldBeBooked && !isCorrectlyBooked) {
      console.log('    ⚠️  PROBLÈME: Cette ressource IA devrait être "booké" mais est "' + resource.booking_status + '"');
    } else if (shouldBeBooked && isCorrectlyBooked) {
      console.log('    ✅ OK: Ressource IA correctement bookée');
    }
  }
}

// Vérifier les profils IA dans la base
console.log('\n🤖 Vérification des profils IA dans hr_profiles:');
const { data: iaProfiles } = await supabase
  .from('hr_profiles')
  .select('id, name, is_ai')
  .eq('is_ai', true);

console.log('  Profils marqués comme IA:', iaProfiles?.map(p => p.name).join(', ') || 'Aucun');

// Vérifier si les profils utilisés dans le projet sont marqués comme IA
if (resources && iaProfiles) {
  const iaProfileIds = iaProfiles.map(p => p.id);
  console.log('\n🔄 Cross-check des ressources du projet:');

  resources.forEach(r => {
    const isIAProfile = iaProfileIds.includes(r.profile_id);
    const profile = r.hr_profiles;
    console.log(`  - ${profile?.name}: Profile marqué IA = ${isIAProfile}, Node data is_ai = ${r.node_data?.is_ai}, Status = ${r.booking_status}`);
  });
}

process.exit(0);