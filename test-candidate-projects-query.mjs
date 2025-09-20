import { createClient } from '@supabase/supabase-js';

// Clés CORRECTES fournies par l'utilisateur
const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

async function testCandidateProjectsQuery() {
  const candidateId = '6cc0150b-30ef-4020-ba1b-ca20ba685310'; // Francis Meleard

  console.log('🔍 Test de la requête useCandidateProjectsOptimized...\n');

  // 1. Test avec ANON KEY (comme dans l'app)
  console.log('📝 TEST 1: Avec ANON KEY (simulation frontend)');
  const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY);

  const { data: anonAssignments, error: anonError } = await supabaseAnon
    .from('hr_resource_assignments')
    .select(`
      *,
      projects (
        id,
        title,
        description,
        status,
        project_date,
        due_date,
        client_budget
      )
    `)
    .eq('candidate_id', candidateId)
    .eq('booking_status', 'accepted');

  if (anonError) {
    console.log('❌ Erreur avec ANON KEY:', anonError);
  } else {
    console.log('✅ Assignments trouvés avec ANON KEY:', anonAssignments?.length || 0);
    if (anonAssignments && anonAssignments.length > 0) {
      console.log('\n📋 Détails des assignments:');
      anonAssignments.forEach(a => {
        console.log(`\n  Assignment ID: ${a.id}`);
        console.log(`  - booking_status: ${a.booking_status}`);
        console.log(`  - project_id: ${a.project_id}`);
        console.log(`  - Projet: ${a.projects ? `"${a.projects.title}" (status: ${a.projects.status})` : '❌ NULL (pas de projet joint)'}`);
      });
    }
  }

  // 2. Test avec SERVICE KEY (contourne RLS)
  console.log('\n📝 TEST 2: Avec SERVICE KEY (sans RLS)');
  const supabaseService = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false }
  });

  const { data: serviceAssignments, error: serviceError } = await supabaseService
    .from('hr_resource_assignments')
    .select(`
      *,
      projects (
        id,
        title,
        description,
        status,
        project_date,
        due_date,
        client_budget
      )
    `)
    .eq('candidate_id', candidateId)
    .eq('booking_status', 'accepted');

  if (serviceError) {
    console.log('❌ Erreur avec SERVICE KEY:', serviceError);
  } else {
    console.log('✅ Assignments trouvés avec SERVICE KEY:', serviceAssignments?.length || 0);
    if (serviceAssignments && serviceAssignments.length > 0) {
      console.log('\n📋 Détails des assignments:');
      serviceAssignments.forEach(a => {
        console.log(`\n  Assignment ID: ${a.id}`);
        console.log(`  - booking_status: ${a.booking_status}`);
        console.log(`  - project_id: ${a.project_id}`);
        console.log(`  - Projet: ${a.projects ? `"${a.projects.title}" (status: ${a.projects.status})` : '❌ NULL (pas de projet joint)'}`);
      });
    }
  }

  // 3. Comparaison
  console.log('\n📊 ANALYSE:');
  const anonCount = anonAssignments?.length || 0;
  const serviceCount = serviceAssignments?.length || 0;

  if (anonCount === serviceCount) {
    console.log('✅ Même nombre d\'assignments avec les deux clés');
  } else {
    console.log(`⚠️ Différence détectée:`);
    console.log(`  - ANON KEY: ${anonCount} assignments`);
    console.log(`  - SERVICE KEY: ${serviceCount} assignments`);
    console.log(`  → Problème probable de RLS sur projects ou hr_resource_assignments`);
  }

  // 4. Vérifier directement les projets
  console.log('\n📝 TEST 3: Accès direct aux projets');
  const projectIds = serviceAssignments?.map(a => a.project_id).filter(Boolean) || [];

  if (projectIds.length > 0) {
    const { data: anonProjects, error: anonProjectError } = await supabaseAnon
      .from('projects')
      .select('id, title, status')
      .in('id', projectIds);

    const { data: serviceProjects } = await supabaseService
      .from('projects')
      .select('id, title, status')
      .in('id', projectIds);

    console.log(`  - Projects visibles avec ANON KEY: ${anonProjects?.length || 0}`);
    console.log(`  - Projects visibles avec SERVICE KEY: ${serviceProjects?.length || 0}`);

    if (!anonProjects || anonProjects.length === 0) {
      console.log('  ❌ RLS bloque l\'accès aux projets avec ANON KEY!');
    }
  }
}

testCandidateProjectsQuery().catch(console.error);