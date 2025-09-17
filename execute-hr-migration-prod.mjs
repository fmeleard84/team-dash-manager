#!/usr/bin/env node

// Script pour exécuter la migration HR en production
import fetch from 'node-fetch';

const PRODUCTION_URL = 'https://nlesrzepybeeghghjafc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZXNyemVweWJlZWdoZ2hqYWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MTczMTcsImV4cCI6MjA3MzQ5MzMxN30.suUB_0rFTaDbmNanEu7fjH5m1adJBJSGJ5PfJn0v__o';

async function executeMigration() {
  console.log('🚀 Exécution de la migration HR en production...');
  console.log('================================================\n');

  try {
    const response = await fetch(`${PRODUCTION_URL}/functions/v1/apply-hr-migration-prod`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Migration exécutée!');
      console.log('\n📊 Résultat:');
      console.log('===========');

      if (result.migrations && result.migrations.length > 0) {
        console.log('\n✅ Opérations réussies:');
        result.migrations.forEach(m => console.log(`  - ${m}`));
      }

      if (result.errors && result.errors.length > 0) {
        console.log('\n⚠️ Erreurs rencontrées:');
        result.errors.forEach(e => console.log(`  - ${e}`));
      }

      if (result.recommendation) {
        console.log('\n💡 Recommandation:', result.recommendation);
      }
    } else {
      console.error('❌ Erreur lors de l\'exécution:', result);
    }
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
  }
}

executeMigration().catch(console.error);