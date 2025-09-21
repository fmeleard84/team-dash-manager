import pg from 'pg';
const { Client } = pg;

async function analyzeComplexity() {
  const client = new Client({
    connectionString: 'postgresql://postgres.egdelmcijszuapcpglsy:Raymonde7510_2a@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'
  });

  try {
    await client.connect();
    console.log('🔍 ANALYSE DE LA COMPLEXITÉ DU SYSTÈME\n');
    console.log('=' .repeat(60));

    // 1. Récupérer TOUS les projets
    console.log('\n📊 1. RÉCUPÉRATION DES PROJETS:\n');

    const projectsResult = await client.query(`
      SELECT id, title, status, owner_id, created_at
      FROM projects
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`✅ ${projectsResult.rows.length} projets trouvés`);

    if (projectsResult.rows.length > 0) {
      console.log('\n📋 Derniers projets:');
      projectsResult.rows.forEach(p => {
        console.log(`  - "${p.title}" (${p.status}) - ID: ${p.id.substring(0, 8)}...`);
      });
    }

    // 2. Rechercher un projet spécifique
    console.log('\n' + '=' .repeat(60));
    console.log('\n🔍 2. RECHERCHE DE PROJETS CONTENANT "82" OU "8082":\n');

    const specificResult = await client.query(`
      SELECT id, title, status, owner_id, created_at
      FROM projects
      WHERE title ILIKE '%82%' OR title ILIKE '%8082%'
    `);

    if (specificResult.rows.length > 0) {
      console.log(`✅ ${specificResult.rows.length} projet(s) trouvé(s):`);
      specificResult.rows.forEach(p => {
        console.log(`\n📁 "${p.title}"`);
        console.log(`  ID: ${p.id}`);
        console.log(`  Status: ${p.status}`);
        console.log(`  Owner: ${p.owner_id}`);
      });
    } else {
      console.log('❌ Aucun projet avec "82" dans le titre');
    }

    // 3. Analyser la structure avec jointures
    console.log('\n' + '=' .repeat(60));
    console.log('\n🏗️ 3. ANALYSE DES RESSOURCES AVEC JOINTURES:\n');

    const resourcesResult = await client.query(`
      SELECT
        p.id as project_id,
        p.title as project_title,
        p.status as project_status,
        COUNT(DISTINCT hra.id) as total_resources,
        COUNT(DISTINCT CASE WHEN hr.is_ai = true THEN hra.id END) as ia_resources,
        COUNT(DISTINCT CASE WHEN hr.is_ai = false OR hr.is_ai IS NULL THEN hra.id END) as human_resources,
        COUNT(DISTINCT CASE WHEN hra.booking_status = 'accepted' THEN hra.id END) as accepted_resources
      FROM projects p
      LEFT JOIN hr_resource_assignments hra ON p.id = hra.project_id
      LEFT JOIN hr_profiles hr ON hra.profile_id = hr.id
      WHERE p.created_at > NOW() - INTERVAL '30 days'
      GROUP BY p.id, p.title, p.status
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    console.log('Projets récents avec leurs ressources:');
    resourcesResult.rows.forEach(row => {
      console.log(`\n📁 "${row.project_title}" (${row.project_status})`);
      console.log(`  Total: ${row.total_resources} ressources`);
      console.log(`  - Humaines: ${row.human_resources}`);
      console.log(`  - IA: ${row.ia_resources}`);
      console.log(`  - Acceptées: ${row.accepted_resources}`);
    });

    // 4. Détail des ressources IA
    console.log('\n' + '=' .repeat(60));
    console.log('\n🤖 4. DÉTAIL DES RESSOURCES IA:\n');

    const iaDetailResult = await client.query(`
      SELECT
        p.title as project_title,
        hr.name as ia_name,
        hr.is_ai,
        hra.booking_status,
        hra.candidate_id,
        hra.profile_id,
        CASE
          WHEN hra.candidate_id = hra.profile_id THEN 'OK ✅'
          WHEN hra.candidate_id IS NULL THEN 'NULL ❌'
          ELSE 'DIFFÉRENT ⚠️'
        END as candidate_check
      FROM hr_resource_assignments hra
      JOIN hr_profiles hr ON hra.profile_id = hr.id
      JOIN projects p ON hra.project_id = p.id
      WHERE hr.is_ai = true
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    if (iaDetailResult.rows.length > 0) {
      console.log('Ressources IA dans les projets:');
      iaDetailResult.rows.forEach(row => {
        console.log(`\n🤖 ${row.ia_name} dans "${row.project_title}"`);
        console.log(`  booking_status: ${row.booking_status}`);
        console.log(`  candidate_id: ${row.candidate_check}`);
      });
    } else {
      console.log('❌ Aucune ressource IA trouvée');
    }

    // 5. Analyse de la complexité
    console.log('\n' + '=' .repeat(60));
    console.log('\n🔬 5. ANALYSE DE LA COMPLEXITÉ:\n');

    // Compter les tables
    const tablesResult = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    console.log(`📊 Nombre total de tables: ${tablesResult.rows[0].count}`);

    // Analyser les relations
    console.log('\n⚙️ Relations clés du système:');

    const relationsResult = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('hr_resource_assignments', 'projects', 'hr_profiles')
      ORDER BY tc.table_name
    `);

    relationsResult.rows.forEach(row => {
      console.log(`  ${row.table_name}.${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
    });

    console.log('\n' + '=' .repeat(60));
    console.log('\n📝 CONCLUSIONS DE L\'ANALYSE:\n');

    console.log('✅ POINTS FORTS:');
    console.log('  1. Architecture unifiée IA/Humain');
    console.log('  2. Jointures directes performantes');
    console.log('  3. Système de booking flexible');
    console.log('  4. Réutilisation complète du code');

    console.log('\n⚠️ COMPLEXITÉ JUSTIFIÉE PAR:');
    console.log('  1. Séparation Métier (hr_profiles) / Personne (candidate_profiles)');
    console.log('  2. Matching automatique des candidats');
    console.log('  3. Workflow de validation (draft → recherche → accepted)');
    console.log('  4. Compatibilité totale IA avec outils existants');

    console.log('\n💡 RECOMMANDATIONS:');
    console.log('  1. ✅ Continuer avec l\'architecture actuelle');
    console.log('  2. ✅ S\'assurer que candidate_id = profile_id pour les IA');
    console.log('  3. ✅ Utiliser les jointures directes partout');
    console.log('  4. ❌ NE PAS ajouter de logique spécifique IA');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await client.end();
  }
}

analyzeComplexity().catch(console.error);