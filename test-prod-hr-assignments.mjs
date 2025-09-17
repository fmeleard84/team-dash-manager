#!/usr/bin/env node

// Script de test pour vérifier la table hr_resource_assignments en production
import { createClient } from '@supabase/supabase-js';

// Configuration PRODUCTION
const SUPABASE_URL = 'https://nlesrzepybeeghghjafc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZXNyemVweWJlZWdoaGdqYWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjg1ODU0MywiZXhwIjoyMDUyNDM0NTQzfQ.gLcVJ29aGGv-4lxe1lbyYoHIXqgvqOhg8CKRcGqF0bc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 Test de la base de production hr_resource_assignments');
console.log('================================================');

async function checkTableStructure() {
  try {
    // 1. Vérifier que la table existe avec une simple requête
    console.log('\n1. Test d\'existence de la table hr_resource_assignments...');
    const { data: testData, error: testError } = await supabase
      .from('hr_resource_assignments')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ Erreur lors de l\'accès à hr_resource_assignments:', testError.message);
      console.log('\nDétails de l\'erreur:', testError);

      // Si la table n'existe pas, on doit la créer
      if (testError.message.includes('relation') && testError.message.includes('does not exist')) {
        console.log('\n⚠️ La table hr_resource_assignments n\'existe pas en production!');
        return false;
      }
    } else {
      console.log('✅ Table hr_resource_assignments accessible');
      console.log('   Nombre d\'enregistrements trouvés:', testData?.length || 0);
    }

    // 2. Tester une requête plus complexe avec jointures
    console.log('\n2. Test de requête avec jointure sur projects...');
    const { data: joinData, error: joinError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        project_id,
        profile_id,
        seniority,
        languages,
        expertises,
        calculated_price,
        booking_status,
        candidate_id,
        created_at,
        projects(id, title, description, owner_id, client_budget, project_date, due_date)
      `)
      .limit(5);

    if (joinError) {
      console.error('❌ Erreur lors de la jointure avec projects:', joinError.message);
      console.log('\nVérification de la table projects...');

      // Vérifier si la table projects existe
      const { error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .limit(1);

      if (projectsError) {
        console.error('❌ La table projects n\'est pas accessible:', projectsError.message);
      } else {
        console.log('✅ Table projects accessible');
      }
    } else {
      console.log('✅ Jointure avec projects réussie');
      console.log('   Données récupérées:', joinData?.length || 0, 'enregistrement(s)');
    }

    // 3. Vérifier les RLS policies
    console.log('\n3. Vérification des politiques RLS...');

    // Test avec un utilisateur candidat fictif
    const candidateId = '958fbe8e-01db-4d56-bb40-5d2d5ef74f95'; // ID du candidat des logs

    const { data: rlsData, error: rlsError } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .eq('candidate_id', candidateId);

    if (rlsError) {
      console.log('⚠️ Erreur potentielle de RLS:', rlsError.message);
    } else {
      console.log('✅ Requête avec candidate_id réussie');
      console.log('   Assignments pour ce candidat:', rlsData?.length || 0);
    }

    return true;
  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    return false;
  }
}

async function checkRelatedTables() {
  console.log('\n4. Vérification des tables associées...');

  const tables = [
    'hr_profiles',
    'hr_categories',
    'candidate_profiles',
    'projects'
  ];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .select('id')
      .limit(1);

    if (error) {
      console.error(`❌ Table ${table} non accessible:`, error.message);
    } else {
      console.log(`✅ Table ${table} accessible`);
    }
  }
}

async function createMissingStructure() {
  console.log('\n5. Analyse de la structure manquante...');

  // Vérifier si nous devons créer la table
  const { data: tables, error: tablesError } = await supabase.rpc('get_all_tables', {
    schema_name: 'public'
  }).single();

  if (tablesError) {
    console.log('Note: Impossible de lister les tables (fonction RPC peut ne pas exister)');

    // Essayons une approche différente avec une requête SQL directe
    console.log('\nTentative de création de la structure hr_resource_assignments...');
    console.log('Utilisez la fonction Edge pour migrer la structure depuis DEV vers PROD');
  }
}

// Exécution du script
async function main() {
  const tableExists = await checkTableStructure();
  await checkRelatedTables();

  if (!tableExists) {
    await createMissingStructure();

    console.log('\n📌 RECOMMANDATION:');
    console.log('================');
    console.log('La table hr_resource_assignments doit être créée en production.');
    console.log('Exécutez la migration depuis l\'environnement de développement:');
    console.log('\n./sync-dev-to-prod.sh');
    console.log('\nOu créez une Edge Function pour appliquer la migration.');
  }

  console.log('\n✅ Test terminé');
}

main().catch(console.error);