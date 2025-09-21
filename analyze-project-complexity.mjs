import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey);

async function analyzeComplexity() {
  console.log('🔍 ANALYSE DE LA COMPLEXITÉ DU SYSTÈME\n');
  console.log('=' .repeat(60));

  // 1. Récupérer TOUS les projets
  console.log('\n📊 1. RÉCUPÉRATION DES PROJETS:\n');

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (projectsError) {
    console.error('❌ Erreur:', projectsError);
    return;
  }

  console.log(`✅ ${projects?.length || 0} projets trouvés`);

  if (projects && projects.length > 0) {
    console.log('\n📋 Derniers projets:');
    projects.forEach(p => {
      console.log(`  - "${p.title}" (${p.status}) - ID: ${p.id.substring(0, 8)}...`);
    });
  }

  // 2. Rechercher un projet spécifique (comme "Projet 8082")
  console.log('\n' + '=' .repeat(60));
  console.log('\n🔍 2. RECHERCHE DE PROJETS CONTENANT "82" OU "8082":\n');

  const { data: specificProjects } = await supabase
    .from('projects')
    .select('id, title, status, owner_id, created_at')
    .or('title.ilike.%82%,title.ilike.%8082%');

  if (specificProjects && specificProjects.length > 0) {
    console.log(`✅ ${specificProjects.length} projet(s) trouvé(s):`);
    specificProjects.forEach(p => {
      console.log(`\n📁 "${p.title}"`);
      console.log(`  ID: ${p.id}`);
      console.log(`  Status: ${p.status}`);
      console.log(`  Owner: ${p.owner_id}`);
      console.log(`  Créé: ${new Date(p.created_at).toLocaleString()}`);
    });
  } else {
    console.log('❌ Aucun projet avec "82" dans le titre');
  }

  // 3. Analyser la structure des ressources (comme dans l'app)
  console.log('\n' + '=' .repeat(60));
  console.log('\n🏗️ 3. STRUCTURE DES RESSOURCES (MÉTHODE APP):\n');

  // Récupérer les IDs de tous les projets
  const allProjectIds = projects?.map(p => p.id) || [];

  if (allProjectIds.length > 0) {
    // Faire la même requête que useProjectsWithResources
    const { data: allAssignments, error: assignmentsError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        hr_profiles (
          id,
          name,
          is_ai,
          base_price
        ),
        candidate_profiles (
          first_name,
          last_name,
          daily_rate
        )
      `)
      .in('project_id', allProjectIds);

    if (assignmentsError) {
      console.error('❌ Erreur assignments:', assignmentsError);
    } else {
      console.log(`✅ ${allAssignments?.length || 0} assignments trouvés`);

      // Grouper par projet
      const assignmentsByProject = (allAssignments || []).reduce((acc, assignment) => {
        if (!acc[assignment.project_id]) {
          acc[assignment.project_id] = [];
        }
        acc[assignment.project_id].push(assignment);
        return acc;
      }, {});

      // Analyser chaque projet
      console.log('\n📊 Analyse par projet:');
      Object.entries(assignmentsByProject).forEach(([projectId, assignments]) => {
        const project = projects?.find(p => p.id === projectId);
        if (project) {
          console.log(`\n📁 "${project.title}"`);
          console.log(`  Total ressources: ${assignments.length}`);

          const iaResources = assignments.filter(a => a.hr_profiles?.is_ai);
          const humanResources = assignments.filter(a => !a.hr_profiles?.is_ai);

          console.log(`  - Humaines: ${humanResources.length}`);
          console.log(`  - IA: ${iaResources.length}`);

          if (iaResources.length > 0) {
            console.log('  🤖 Ressources IA:');
            iaResources.forEach(ia => {
              console.log(`    - ${ia.hr_profiles.name}`);
              console.log(`      booking_status: ${ia.booking_status}`);
              console.log(`      candidate_id: ${ia.candidate_id || 'NULL'}`);
            });
          }
        }
      });
    }
  }

  // 4. Analyser la complexité
  console.log('\n' + '=' .repeat(60));
  console.log('\n🔬 4. ANALYSE DE LA COMPLEXITÉ:\n');

  console.log('📊 Tables impliquées dans le système:');
  console.log('  1. projects - Les projets');
  console.log('  2. hr_profiles - Les métiers/profils (humains et IA)');
  console.log('  3. hr_resource_assignments - Les assignations');
  console.log('  4. candidate_profiles - Les profils candidats');
  console.log('  5. profiles - Les profils utilisateurs');

  console.log('\n⚙️ Relations complexes:');
  console.log('  - hr_resource_assignments.profile_id → hr_profiles.id');
  console.log('  - hr_resource_assignments.candidate_id → candidate_profiles.id');
  console.log('  - hr_resource_assignments.project_id → projects.id');
  console.log('  - Pour IA: candidate_id = profile_id (même UUID)');

  console.log('\n🤔 POURQUOI CETTE COMPLEXITÉ ?');
  console.log('\n1. Séparation Métier/Personne:');
  console.log('   - hr_profiles = Le MÉTIER (Chef de projet, Développeur, IA Rédacteur)');
  console.log('   - candidate_profiles = La PERSONNE qui occupe ce métier');
  console.log('   - Permet plusieurs candidats pour un même métier');

  console.log('\n2. Système de Booking:');
  console.log('   - draft → recherche → accepted/declined');
  console.log('   - Permet matching automatique des candidats');
  console.log('   - IA auto-accepte (trigger PostgreSQL)');

  console.log('\n3. Unification IA/Humain:');
  console.log('   - IA traités comme candidats spéciaux');
  console.log('   - Même flux, mêmes outils (Kanban, Drive, Messages)');
  console.log('   - Pas de code conditionnel if(is_ai)');

  console.log('\n💡 OPTIMISATIONS POSSIBLES:');
  console.log('\n1. ✅ Jointures directes (déjà fait dans l\'app):');
  console.log('   - Un seul SELECT avec jointures au lieu de multiples requêtes');
  console.log('   - Performance O(1) au lieu de O(n)');

  console.log('\n2. ⚠️ Simplification possible:');
  console.log('   - Fusionner hr_profiles et candidate_profiles pour les IA');
  console.log('   - Mais casserait la compatibilité avec le système existant');

  console.log('\n3. ✅ Architecture actuelle justifiée car:');
  console.log('   - Flexibilité du matching candidats');
  console.log('   - Réutilisation complète du code existant');
  console.log('   - Évolutivité (nouvelles capacités IA faciles à ajouter)');

  console.log('\n' + '=' .repeat(60));
  console.log('\n📝 CONCLUSION:\n');
  console.log('La complexité apparente vient de la volonté de traiter les IA');
  console.log('exactement comme des humains, sans code spécifique.');
  console.log('C\'est un choix architectural qui apporte flexibilité et maintenabilité.');
  console.log('\nLa "difficulté" à trouver les projets venait du fait que mes scripts');
  console.log('ne faisaient pas les bonnes jointures, contrairement à l\'application');
  console.log('qui utilise des requêtes optimisées avec jointures directes.');
}

analyzeComplexity().catch(console.error);