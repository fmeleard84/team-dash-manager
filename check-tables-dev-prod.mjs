#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Configuration Développement
const DEV_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const DEV_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

// Configuration Production
const PROD_URL = 'https://nlesrzepybeeghghjafc.supabase.co';
const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZXNyemVweWJlZWdoZ2hqYWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MTczMTcsImV4cCI6MjA3MzQ5MzMxN30.suUB_0rFTaDbmNanEu7fjH5m1adJBJSGJ5PfJn0v__o';

const supabaseDev = createClient(DEV_URL, DEV_KEY);
const supabaseProd = createClient(PROD_URL, PROD_KEY);

console.log('\n🔍 Comparaison des tables Dev vs Prod');
console.log('=====================================\n');

async function checkTables() {
  // Tables critiques à vérifier
  const tablesToCheck = [
    'profiles',
    'candidate_profiles',
    'client_profiles',
    'projects',
    'hr_resource_assignments'
  ];

  for (const table of tablesToCheck) {
    console.log(`📊 Table: ${table}`);
    console.log('-'.repeat(40));

    // Test en DEV
    try {
      const { data: devData, error: devError } = await supabaseDev
        .from(table)
        .select('*')
        .limit(1);

      if (devError) {
        console.log(`❌ DEV: Erreur - ${devError.message}`);
      } else {
        console.log(`✅ DEV: Table existe (${devData ? 'accessible' : 'vide'})`);
      }
    } catch (e) {
      console.log(`❌ DEV: Exception - ${e.message}`);
    }

    // Test en PROD
    try {
      const { data: prodData, error: prodError } = await supabaseProd
        .from(table)
        .select('*')
        .limit(1);

      if (prodError) {
        console.log(`❌ PROD: Erreur - ${prodError.message}`);
      } else {
        console.log(`✅ PROD: Table existe (${prodData ? 'accessible' : 'vide'})`);
      }
    } catch (e) {
      console.log(`❌ PROD: Exception - ${e.message}`);
    }

    console.log('');
  }

  // Test spécifique pour voir si on peut créer un profil
  console.log('🧪 Test d\'insertion dans profiles');
  console.log('-'.repeat(40));

  // Créer un ID de test
  const testId = 'test-' + Date.now();
  const testProfile = {
    id: testId,
    email: `test${Date.now()}@test.com`,
    role: 'candidate',
    first_name: 'Test',
    last_name: 'User'
  };

  // Test DEV
  const { error: devInsertError } = await supabaseDev
    .from('profiles')
    .insert(testProfile);

  if (devInsertError) {
    console.log(`❌ DEV Insert: ${devInsertError.message}`);
  } else {
    console.log('✅ DEV Insert: OK');
    // Nettoyer
    await supabaseDev.from('profiles').delete().eq('id', testId);
  }

  // Test PROD
  const { error: prodInsertError } = await supabaseProd
    .from('profiles')
    .insert(testProfile);

  if (prodInsertError) {
    console.log(`❌ PROD Insert: ${prodInsertError.message}`);
  } else {
    console.log('✅ PROD Insert: OK');
    // Nettoyer
    await supabaseProd.from('profiles').delete().eq('id', testId);
  }
}

checkTables().catch(console.error);