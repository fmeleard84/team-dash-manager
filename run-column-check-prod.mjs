#!/usr/bin/env node

import fetch from 'node-fetch';

const PRODUCTION_URL = 'https://nlesrzepybeeghghjafc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZXNyemVweWJlZWdoaGdqYWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MTczMTcsImV4cCI6MjA3MzQ5MzMxN30.suUB_0rFTaDbmNanEu7fjH5m1adJBJSGJ5PfJn0v__o';

async function checkColumns() {
  console.log('🔍 Vérification des colonnes en production...\n');

  try {
    const response = await fetch(`${PRODUCTION_URL}/functions/v1/check-and-fix-columns`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (result.report) {
      console.log(`📊 Environnement: ${result.report.environment}\n`);

      // Afficher les vérifications
      console.log('Résultats des vérifications:');
      console.log('-'.repeat(50));

      for (const check of result.report.checks) {
        const icon = check.status === 'EXISTS' ? '✅' :
                     check.status === 'MISSING' ? '❌' : '⚠️';
        console.log(`${icon} ${check.table}.${check.column}: ${check.status}`);
      }

      // Afficher les erreurs s'il y en a
      if (result.report.errors && result.report.errors.length > 0) {
        console.log('\n⚠️ Erreurs rencontrées:');
        result.report.errors.forEach(err => console.log(`  - ${err}`));
      }

      // Afficher le script SQL si nécessaire
      if (result.report.sqlScript) {
        console.log('\n📝 Script SQL à exécuter en production:');
        console.log('=' .repeat(50));
        console.log(result.report.sqlScript);
        console.log('=' .repeat(50));
      }
    }

    console.log(`\n${result.success ? '✅' : '⚠️'} ${result.message}`);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkColumns().catch(console.error);