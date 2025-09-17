#!/usr/bin/env node

// Script pour exécuter la fonction de réparation en production
import fetch from 'node-fetch';

const PRODUCTION_URL = 'https://nlesrzepybeeghghjafc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZXNyemVweWJlZWdoZ2hqYWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MTczMTcsImV4cCI6MjA3MzQ5MzMxN30.suUB_0rFTaDbmNanEu7fjH5m1adJBJSGJ5PfJn0v__o';

async function runFix() {
  console.log('🚀 Exécution de la fonction de réparation des tables HR en production...\n');

  try {
    const response = await fetch(`${PRODUCTION_URL}/functions/v1/fix-production-hr-tables`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Fonction exécutée avec succès!');
      console.log('\nRésultat:', JSON.stringify(result, null, 2));
    } else {
      console.error('❌ Erreur lors de l\'exécution:', result);
    }
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
  }
}

runFix().catch(console.error);