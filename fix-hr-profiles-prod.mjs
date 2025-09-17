#!/usr/bin/env node

import fetch from 'node-fetch';

const PRODUCTION_URL = 'https://nlesrzepybeeghghjafc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZXNyemVweWJlZWdoZ2hqYWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MTczMTcsImV4cCI6MjA3MzQ5MzMxN30.suUB_0rFTaDbmNanEu7fjH5m1adJBJSGJ5PfJn0v__o';

async function fixProfiles() {
  console.log('🔧 Correction de hr_profiles en production...\n');

  try {
    const response = await fetch(`${PRODUCTION_URL}/functions/v1/fix-hr-profiles-prod`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    console.log('📊 Résultat:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ Structure corrigée avec succès!');
    } else {
      console.log('\n⚠️ Corrections partielles appliquées');
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

fixProfiles().catch(console.error);