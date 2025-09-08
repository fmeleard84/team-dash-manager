#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: "postgresql://postgres.egdelmcijszuapcpglsy:R@ymonde7510_2a@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
});

console.log("🔧 Application des corrections RLS pour les candidats\n");
console.log("=" .repeat(60));

async function applyRLSFix() {
  try {
    await client.connect();
    console.log("✅ Connecté à la base de données\n");

    // 1. Nettoyer les anciennes policies
    console.log("1️⃣ Suppression des anciennes policies...");
    
    const dropPolicies = [
      "DROP POLICY IF EXISTS \"Users can view their own projects\" ON projects",
      "DROP POLICY IF EXISTS \"Clients can view their projects\" ON projects",
      "DROP POLICY IF EXISTS \"Candidats voient projets où ils sont assignés\" ON projects",
      "DROP POLICY IF EXISTS \"Candidats accèdent à leurs projets acceptés\" ON projects",
      "DROP POLICY IF EXISTS \"Users can view projects they are assigned to\" ON projects",
      "DROP POLICY IF EXISTS \"Enable read access for authenticated users\" ON projects",
      "DROP POLICY IF EXISTS \"Candidats voient leurs assignations\" ON hr_resource_assignments",
      "DROP POLICY IF EXISTS \"Candidats peuvent voir leurs propres assignations\" ON hr_resource_assignments",
      "DROP POLICY IF EXISTS \"Users can view resource assignments for their projects\" ON hr_resource_assignments",
      "DROP POLICY IF EXISTS \"Enable read access for authenticated users\" ON hr_resource_assignments",
      "DROP POLICY IF EXISTS \"Candidats peuvent accepter/refuser\" ON hr_resource_assignments"
    ];

    for (const query of dropPolicies) {
      await client.query(query);
    }
    console.log("✅ Anciennes policies supprimées\n");

    // 2. Créer les nouvelles policies pour projects
    console.log("2️⃣ Création des nouvelles policies pour 'projects'...");
    
    // Policy pour les clients
    await client.query(`
      CREATE POLICY "Clients voient leurs propres projets"
      ON projects FOR ALL
      TO authenticated
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid())
    `);
    console.log("   ✅ Policy clients créée");

    // Policy pour les candidats
    await client.query(`
      CREATE POLICY "Candidats voient projets où ils sont acceptés"
      ON projects FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 
          FROM hr_resource_assignments hra
          WHERE hra.project_id = projects.id
            AND hra.candidate_id = auth.uid()
            AND hra.booking_status = 'accepted'
        )
        AND projects.status IN ('attente-team', 'play', 'completed')
      )
    `);
    console.log("   ✅ Policy candidats créée");

    // 3. Créer les policies pour hr_resource_assignments
    console.log("\n3️⃣ Création des policies pour 'hr_resource_assignments'...");
    
    // Policy pour les clients
    await client.query(`
      CREATE POLICY "Clients voient assignations de leurs projets"
      ON hr_resource_assignments FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = hr_resource_assignments.project_id
          AND projects.owner_id = auth.uid()
        )
      )
    `);
    console.log("   ✅ Policy clients créée");

    // Policy pour les candidats (SELECT)
    await client.query(`
      CREATE POLICY "Candidats voient leurs assignations"
      ON hr_resource_assignments FOR SELECT
      TO authenticated
      USING (candidate_id = auth.uid())
    `);
    console.log("   ✅ Policy candidats SELECT créée");

    // Policy pour les candidats (UPDATE)
    await client.query(`
      CREATE POLICY "Candidats peuvent accepter ou refuser"
      ON hr_resource_assignments FOR UPDATE
      TO authenticated
      USING (
        candidate_id = auth.uid()
        AND booking_status = 'recherche'
      )
      WITH CHECK (
        candidate_id = auth.uid()
        AND booking_status IN ('accepted', 'declined')
      )
    `);
    console.log("   ✅ Policy candidats UPDATE créée");

    // 4. Activer RLS sur les tables
    console.log("\n4️⃣ Activation du RLS sur les tables...");
    
    const tables = ['projects', 'hr_resource_assignments', 'project_events', 'kanban_columns', 'kanban_tasks', 'messages'];
    for (const table of tables) {
      await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      console.log(`   ✅ RLS activé sur ${table}`);
    }

    // 5. Créer la fonction helper
    console.log("\n5️⃣ Création de la fonction helper...");
    
    await client.query(`
      CREATE OR REPLACE FUNCTION check_candidate_project_access(
        p_candidate_id UUID,
        p_project_id UUID
      )
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1
          FROM hr_resource_assignments hra
          JOIN projects p ON p.id = hra.project_id
          WHERE hra.candidate_id = p_candidate_id
            AND hra.project_id = p_project_id
            AND hra.booking_status = 'accepted'
            AND p.status IN ('attente-team', 'play', 'completed')
        );
      END;
      $$
    `);
    
    await client.query(`GRANT EXECUTE ON FUNCTION check_candidate_project_access TO authenticated`);
    console.log("   ✅ Fonction helper créée");

    // 6. Vérification finale
    console.log("\n6️⃣ Vérification de l'application...");
    
    // Compter les policies créées
    const { rows: policiesCount } = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename IN ('projects', 'hr_resource_assignments')
    `);
    
    console.log(`   ✅ ${policiesCount[0].count} policies actives sur projects et hr_resource_assignments`);

    // Vérifier un cas de test
    const { rows: testCase } = await client.query(`
      SELECT 
        hra.candidate_id,
        hra.project_id,
        hra.booking_status,
        p.title,
        p.status as project_status
      FROM hr_resource_assignments hra
      JOIN projects p ON p.id = hra.project_id
      WHERE hra.booking_status = 'accepted'
      LIMIT 1
    `);

    if (testCase.length > 0) {
      const test = testCase[0];
      console.log(`\n   📋 Cas de test trouvé:`);
      console.log(`      - Candidat: ${test.candidate_id}`);
      console.log(`      - Projet: "${test.title}" (${test.project_status})`);
      console.log(`      - Booking: ${test.booking_status}`);
      
      // Tester la fonction helper
      const { rows: accessTest } = await client.query(
        `SELECT check_candidate_project_access($1, $2) as has_access`,
        [test.candidate_id, test.project_id]
      );
      
      console.log(`      - Accès via fonction helper: ${accessTest[0].has_access ? '✅ OUI' : '❌ NON'}`);
    }

    console.log("\n✅ Toutes les corrections RLS ont été appliquées avec succès!");
    console.log("\n📝 Notes importantes:");
    console.log("   - Les candidats peuvent maintenant voir les projets où ils sont acceptés");
    console.log("   - Seuls les projets avec status 'attente-team', 'play' ou 'completed' sont visibles");
    console.log("   - Les candidats peuvent accepter ou refuser les missions en 'recherche'");
    console.log("   - Les clients voient tous leurs projets et toutes les assignations associées");

  } catch (error) {
    console.error("\n❌ Erreur lors de l'application des corrections:", error.message);
    console.error(error);
  } finally {
    await client.end();
    console.log("\n🔒 Connexion fermée");
  }
}

// Exécuter les corrections
applyRLSFix();