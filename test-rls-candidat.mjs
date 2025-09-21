#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U";

// Test avec authentification comme candidat
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRLSCandidatAccess() {
  console.log('🔐 TEST RLS - Accès candidat aux assignments IA');
  console.log('='.repeat(60));

  const projectId = '5ec653f5-5de9-4291-a2d9-e301425adbad';
  const candidatUserId = '6cc0150b-30ef-4020-ba1b-ca20ba685310'; // Francis

  try {
    // 1. Se connecter comme le candidat
    console.log('\n1️⃣ Simulation connexion candidat...');

    // On ne peut pas vraiment se connecter, mais on peut tester les requêtes
    // qui seraient faites avec l'authentification candidat

    console.log(`   Candidat ID: ${candidatUserId}`);
    console.log(`   Projet ID: ${projectId}`);

    // 2. Test 1: Accès direct à hr_resource_assignments (comme fait le hook)
    console.log('\n2️⃣ Test accès hr_resource_assignments...');

    const { data: assignments, error: assignError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        hr_profiles (
          name,
          is_ai,
          prompt_id
        ),
        candidate_profiles (
          first_name,
          last_name
        )
      `)
      .eq('project_id', projectId);

    if (assignError) {
      console.error('❌ Erreur hr_resource_assignments:', assignError);
    } else {
      console.log(`✅ ${assignments?.length || 0} assignments récupérés (sans auth)`);

      if (assignments) {
        console.log('\n📋 Détails des assignments:');
        for (const assign of assignments) {
          const isAI = assign.hr_profiles?.is_ai;
          console.log(`   ${isAI ? '🤖' : '👤'} ${assign.hr_profiles?.name || 'Sans nom'}`);
          console.log(`      - Profile ID: ${assign.profile_id}`);
          console.log(`      - Candidate ID: ${assign.candidate_id || 'NULL'}`);
          console.log(`      - Booking Status: ${assign.booking_status}`);
          console.log(`      - is_AI: ${isAI}`);
        }
      }
    }

    // 3. Test 2: Accès aux hr_profiles directement
    console.log('\n3️⃣ Test accès hr_profiles avec is_ai = true...');

    const { data: iaProfiles, error: iaError } = await supabase
      .from('hr_profiles')
      .select('id, name, is_ai, prompt_id')
      .eq('is_ai', true);

    if (iaError) {
      console.error('❌ Erreur hr_profiles:', iaError);
    } else {
      console.log(`✅ ${iaProfiles?.length || 0} profils IA accessibles`);
      if (iaProfiles) {
        for (const ia of iaProfiles) {
          console.log(`   🤖 ${ia.name} (ID: ${ia.id})`);
        }
      }
    }

    // 4. Test 3: Recherche des assignments IA spécifiquement
    console.log('\n4️⃣ Test recherche assignments avec is_ai = true...');

    const { data: iaAssignments, error: iaAssignError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        hr_profiles!inner (
          name,
          is_ai,
          prompt_id
        )
      `)
      .eq('project_id', projectId)
      .eq('hr_profiles.is_ai', true);

    if (iaAssignError) {
      console.error('❌ Erreur assignments IA:', iaAssignError);
    } else {
      console.log(`✅ ${iaAssignments?.length || 0} assignments IA trouvés`);
      if (iaAssignments && iaAssignments.length > 0) {
        console.log('\n🤖 Assignments IA détails:');
        for (const assign of iaAssignments) {
          console.log(`   - ${assign.hr_profiles.name}`);
          console.log(`     Status: ${assign.booking_status}`);
          console.log(`     Profile ID: ${assign.profile_id}`);
          console.log(`     Candidate ID: ${assign.candidate_id || 'NULL'}`);
        }
      }
    }

    // 5. Test 4: Vérifier les politiques RLS actives
    console.log('\n5️⃣ Test politique RLS...');
    console.log('NOTE: Sans vraie authentification, on ne peut pas tester les RLS réelles');
    console.log('Mais on peut voir si les données sont visibles en mode anonyme');

    // 6. Résumé du diagnostic
    console.log('\n📊 DIAGNOSTIC RLS:');

    const totalAssignments = assignments?.length || 0;
    const iaCount = assignments?.filter(a => a.hr_profiles?.is_ai).length || 0;
    const iaAssignmentCount = iaAssignments?.length || 0;

    console.log(`   - Total assignments projet: ${totalAssignments}`);
    console.log(`   - IA dans les assignments: ${iaCount}`);
    console.log(`   - Assignments IA directes: ${iaAssignmentCount}`);

    if (totalAssignments > 0 && iaCount === 0 && iaAssignmentCount > 0) {
      console.log('\n⚠️ PROBLÈME RLS DÉTECTÉ:');
      console.log('Les IA existent en requête directe mais pas dans la jointure!');
      console.log('Cela indique un problème de politique RLS sur hr_profiles');
    } else if (iaAssignmentCount === 0) {
      console.log('\n❓ Problème possible:');
      console.log('Aucun assignment IA trouvé - vérifier s\'ils existent vraiment');
    } else {
      console.log('\n✅ RLS semble OK en mode anonyme');
      console.log('Le problème pourrait être spécifique à l\'auth candidat');
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Pour tester les RLS avec vraie auth candidat, il faudrait :
console.log('\n💡 POUR TEST COMPLET RLS:');
console.log('1. Ouvrir la console navigateur côté candidat');
console.log('2. Exécuter manuellement la requête Supabase dans la console');
console.log('3. Comparer avec la même requête côté client');
console.log('\nCode à tester dans la console navigateur:');
console.log(`
// À exécuter dans la console du navigateur côté CANDIDAT
const { data, error } = await supabase
  .from('hr_resource_assignments')
  .select(\`
    *,
    hr_profiles (name, is_ai, prompt_id)
  \`)
  .eq('project_id', '5ec653f5-5de9-4291-a2d9-e301425adbad');

console.log('Résultat candidat:', data, error);
`);

testRLSCandidatAccess();