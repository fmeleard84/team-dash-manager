// Diagnose Storage RLS Issues
const diagnose = async () => {
  try {
    console.log('🔍 Diagnostic des politiques RLS Storage...\n');

    // Fonction pour exécuter une requête SQL
    const executeSql = async (sql, description) => {
      console.log(`📋 ${description}...`);
      const response = await fetch('https://egdelmcijszuapcpglsy.supabase.co/functions/v1/exec-sql', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQzMjg2MTcsImV4cCI6MjAzOTkwNDYxN30.Z8xt6O-jE8F6Y0Xc7yNdLzIhIQh0w3F6X4ZLe8R6k5g',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQzMjg2MTcsImV4cCI6MjAzOTkwNDYxN30.Z8xt6O-jE8F6Y0Xc7yNdLzIhIQh0w3F6X4ZLe8R6k5g',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql })
      });

      const result = await response.json();
      if (result.success) {
        console.log('✅ Succès');
        return result.data;
      } else {
        console.log('❌ Erreur:', result.error);
        return null;
      }
    };

    // 1. Vérifier les politiques RLS actuelles
    const policies = await executeSql(`
      SELECT policyname, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'objects' 
      AND schemaname = 'storage'
      AND policyname LIKE '%member%';
    `, 'Vérification des politiques RLS member');

    console.log('📋 Politiques trouvées:', policies);
    
    // 2. Vérifier le candidat
    const candidate = await executeSql(`
      SELECT 
          cp.id,
          cp.first_name,
          cp.last_name,
          cp.user_id,
          cp.email,
          au.id as auth_user_id,
          au.email as auth_email
      FROM candidate_profiles cp
      LEFT JOIN auth.users au ON au.id = cp.user_id
      WHERE cp.first_name = 'CDP FM 2708';
    `, 'Vérification du candidat CDP FM 2708');

    console.log('👤 Candidat trouvé:', candidate);

    // 3. Vérifier les assignations
    const assignments = await executeSql(`
      SELECT 
          hra.id,
          hra.project_id,
          hra.booking_status,
          hra.candidate_id,
          cp.user_id,
          cp.first_name
      FROM hr_resource_assignments hra
      JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id = 'd7dff6ec-5019-40ab-a00f-8bac8806eca7';
    `, 'Vérification des assignations du projet');

    console.log('📂 Assignations trouvées:', assignments);

    // 4. Vérifier toutes les politiques storage
    const allPolicies = await executeSql(`
      SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
      ORDER BY policyname;
    `, 'Vérification de toutes les politiques storage');

    console.log('🔐 Toutes les politiques storage:', allPolicies);

    // 5. Vérifier le projet et son propriétaire
    const project = await executeSql(`
      SELECT 
          p.id as project_id,
          p.name as project_name,
          p.owner_id,
          au.email as owner_email
      FROM projects p
      LEFT JOIN auth.users au ON au.id = p.owner_id
      WHERE p.id = 'd7dff6ec-5019-40ab-a00f-8bac8806eca7';
    `, 'Vérification du projet et du propriétaire');

    console.log('👔 Projet et propriétaire:', project);

    // 6. Test de la logique RLS pour le storage
    const rlsTest = await executeSql(`
      -- Test pour comprendre pourquoi RLS échoue
      SELECT 
          'Test candidat' as test_type,
          cp.user_id as candidate_user_id,
          cp.first_name,
          hra.booking_status,
          hra.project_id,
          -- Simulation path
          'projects/' || hra.project_id || '/test-file.pdf' as simulated_path,
          -- Vérification de la logique RLS
          CASE 
              WHEN hra.booking_status = 'accepted' THEN 'Booking OK'
              ELSE 'Booking NOK: ' || COALESCE(hra.booking_status, 'NULL')
          END as booking_check
      FROM candidate_profiles cp
      JOIN hr_resource_assignments hra ON hra.candidate_id = cp.id
      WHERE hra.project_id = 'd7dff6ec-5019-40ab-a00f-8bac8806eca7'
        AND cp.first_name = 'CDP FM 2708';
    `, 'Test de la logique RLS');

    console.log('🧪 Test RLS:', rlsTest);

    // Analyse des résultats
    console.log('\n🎯 ANALYSE DES RÉSULTATS');
    console.log('=======================');

    if (candidate && candidate.length > 0) {
      const cand = candidate[0];
      console.log(`✅ Candidat trouvé: ${cand.first_name}`);
      console.log(`   User ID Profile: ${cand.user_id}`);
      console.log(`   User ID Auth: ${cand.auth_user_id}`);
      console.log(`   Match: ${cand.user_id === cand.auth_user_id ? '✅' : '❌'}`);
    } else {
      console.log('❌ Candidat non trouvé');
    }

    if (assignments && assignments.length > 0) {
      const assign = assignments[0];
      console.log(`✅ Assignation trouvée: ${assign.first_name}`);
      console.log(`   Booking Status: ${assign.booking_status}`);
      console.log(`   Status OK pour RLS: ${assign.booking_status === 'accepted' ? '✅' : '❌'}`);
    } else {
      console.log('❌ Assignation non trouvée');
    }

    if (policies && policies.length > 0) {
      console.log(`✅ ${policies.length} politique(s) RLS member trouvée(s)`);
      policies.forEach((pol, i) => {
        console.log(`   ${i+1}. ${pol.policyname} (${pol.cmd})`);
        console.log(`      Condition: ${pol.qual}`);
      });
    } else {
      console.log('❌ Aucune politique RLS member trouvée');
    }

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  }
};

diagnose();