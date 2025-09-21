import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey);

async function deepAnalysis() {
  console.log('🔍 ANALYSE APPROFONDIE DES STRUCTURES DE DONNÉES\n');
  console.log('=' .repeat(60));

  // 1. Combien de projets au total ?
  console.log('\n📊 1. ÉTAT DE LA BASE DE DONNÉES:\n');

  const { count: totalProjects } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  console.log(`Total projets dans la base: ${totalProjects}`);

  // 2. Les 5 derniers projets créés
  console.log('\n📋 2. DERNIERS PROJETS CRÉÉS:\n');

  const { data: recentProjects } = await supabase
    .from('projects')
    .select('id, title, status, owner_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  recentProjects?.forEach(p => {
    console.log(`"${p.title}"`);
    console.log(`  ID: ${p.id}`);
    console.log(`  Status: ${p.status}`);
    console.log(`  Owner: ${p.owner_id}`);
    console.log(`  Créé: ${new Date(p.created_at).toLocaleString()}`);
    console.log('');
  });

  // 3. Rechercher le projet avec titre contenant "82" ou "8082"
  console.log('=' .repeat(60));
  console.log('\n🔍 3. RECHERCHE DE "PROJET 8082":\n');

  const { data: projet8082 } = await supabase
    .from('projects')
    .select('*')
    .or('title.ilike.%82%,title.ilike.%8082%');

  if (projet8082 && projet8082.length > 0) {
    console.log(`✅ Trouvé ${projet8082.length} projet(s) avec "82" dans le titre:`);
    projet8082.forEach(p => {
      console.log(`\n📁 "${p.title}"`);
      console.log(`  ID: ${p.id}`);
      console.log(`  Status: ${p.status}`);
    });
  } else {
    console.log('❌ Aucun projet avec "82" dans le titre');
  }

  // 4. Structure des ressources HR
  console.log('\n' + '=' .repeat(60));
  console.log('\n🏗️ 4. STRUCTURE DES RESSOURCES HR:\n');

  const { count: totalAssignments } = await supabase
    .from('hr_resource_assignments')
    .select('*', { count: 'exact', head: true });

  const { count: totalProfiles } = await supabase
    .from('hr_profiles')
    .select('*', { count: 'exact', head: true });

  console.log(`Total hr_resource_assignments: ${totalAssignments}`);
  console.log(`Total hr_profiles: ${totalProfiles}`);

  // 5. Ressources IA
  console.log('\n🤖 Ressources IA dans hr_profiles:');

  const { data: iaProfiles } = await supabase
    .from('hr_profiles')
    .select('id, name, is_ai, prompt_id')
    .eq('is_ai', true);

  if (iaProfiles && iaProfiles.length > 0) {
    console.log(`  ✅ ${iaProfiles.length} profil(s) IA trouvé(s):`);
    iaProfiles.forEach(ia => {
      console.log(`    - ${ia.name} (ID: ${ia.id})`);
    });
  } else {
    console.log('  ❌ Aucun profil avec is_ai = true');
  }

  // 6. Projets avec ressources assignées
  console.log('\n' + '=' .repeat(60));
  console.log('\n🔗 5. PROJETS AVEC RESSOURCES ASSIGNÉES:\n');

  const { data: projectsWithResources } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      status,
      hr_resource_assignments (
        id,
        profile_id,
        candidate_id,
        booking_status,
        hr_profiles (
          name,
          is_ai
        )
      )
    `)
    .limit(3)
    .order('created_at', { ascending: false });

  projectsWithResources?.forEach(p => {
    console.log(`📁 "${p.title}"`);
    console.log(`  Status: ${p.status}`);
    if (p.hr_resource_assignments && p.hr_resource_assignments.length > 0) {
      console.log(`  Ressources (${p.hr_resource_assignments.length}):`);
      p.hr_resource_assignments.forEach(r => {
        const icon = r.hr_profiles?.is_ai ? '🤖' : '👤';
        console.log(`    ${icon} ${r.hr_profiles?.name || 'N/A'}`);
        console.log(`       - booking_status: ${r.booking_status}`);
        console.log(`       - candidate_id: ${r.candidate_id || 'NULL'}`);
      });
    } else {
      console.log('  ❌ Aucune ressource assignée');
    }
    console.log('');
  });

  // 7. Analyse des booking_status
  console.log('=' .repeat(60));
  console.log('\n📊 6. DISTRIBUTION DES BOOKING_STATUS:\n');

  const { data: statusDistribution } = await supabase
    .from('hr_resource_assignments')
    .select('booking_status');

  const statusCount = {};
  statusDistribution?.forEach(s => {
    statusCount[s.booking_status] = (statusCount[s.booking_status] || 0) + 1;
  });

  Object.entries(statusCount).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  // 8. Recherche spécifique du client et candidat des logs
  console.log('\n' + '=' .repeat(60));
  console.log('\n👥 7. UTILISATEURS DES LOGS:\n');

  const clientId = '8a1f0522-7c13-4bb9-8bdf-8c6e6f80228a';
  const candidateId = '6cc0150b-30ef-4020-ba1b-ca20ba685310';

  const { data: clientProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', clientId)
    .single();

  const { data: candidateProfile } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('id', candidateId)
    .single();

  console.log('Client:');
  if (clientProfile) {
    console.log(`  ✅ ${clientProfile.first_name} ${clientProfile.last_name}`);
    console.log(`     Email: ${clientProfile.email}`);
  } else {
    console.log('  ❌ Non trouvé');
  }

  console.log('\nCandidat:');
  if (candidateProfile) {
    console.log(`  ✅ ${candidateProfile.first_name} ${candidateProfile.last_name}`);
    console.log(`     Email: ${candidateProfile.email}`);
    console.log(`     Métier: ${candidateProfile.position}`);
  } else {
    console.log('  ❌ Non trouvé');
  }

  // 9. Projets de ce client
  console.log('\n📂 Projets du client:');
  const { data: clientProjects } = await supabase
    .from('projects')
    .select('id, title, status')
    .eq('owner_id', clientId)
    .order('created_at', { ascending: false })
    .limit(5);

  clientProjects?.forEach(p => {
    console.log(`  - "${p.title}" (${p.status})`);
  });
}

deepAnalysis().catch(console.error);