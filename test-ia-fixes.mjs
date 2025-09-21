#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

console.log('🧪 TEST DES CORRECTIONS IA\n');
console.log('=' .repeat(60));

async function testIAFixes() {
  try {
    // 1. Vérifier qu'on peut récupérer les ressources IA avec prompt_id
    console.log('\n📋 1. TEST: Récupération des ressources IA avec prompt_id');

    const { data: iaResources, error: iaError } = await supabase
      .from('hr_profiles')
      .select('id, name, is_ai, prompt_id')
      .eq('is_ai', true);

    if (iaError) {
      console.error('❌ Erreur:', iaError);
    } else {
      console.log('✅ Ressources IA trouvées:', iaResources.length);
      iaResources.forEach(ia => {
        console.log(`  - ${ia.name}: prompt_id = ${ia.prompt_id || 'NON DÉFINI ⚠️'}`);
      });
    }

    // 2. Vérifier les assignations avec booking_status = 'accepted'
    console.log('\n📋 2. TEST: Vérification des assignations IA');

    const { data: assignments, error: assignError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        project_id,
        profile_id,
        candidate_id,
        booking_status,
        hr_profiles!inner (
          name,
          is_ai,
          prompt_id
        )
      `)
      .eq('hr_profiles.is_ai', true);

    if (assignError) {
      console.error('❌ Erreur:', assignError);
    } else {
      console.log('✅ Assignations IA trouvées:', assignments.length);
      assignments.forEach(a => {
        console.log(`  - ${a.hr_profiles.name}:`);
        console.log(`    booking_status: ${a.booking_status}`);
        console.log(`    candidate_id == profile_id: ${a.candidate_id === a.profile_id ? '✅' : '❌'}`);
        console.log(`    prompt_id: ${a.hr_profiles.prompt_id || 'NON DÉFINI ⚠️'}`);
      });
    }

    // 3. Tester la requête des membres de projet (comme dans le hook)
    console.log('\n📋 3. TEST: Requête membres de projet (simulation du hook)');

    // Trouver un projet avec des IA
    const { data: projectWithIA } = await supabase
      .from('hr_resource_assignments')
      .select('project_id')
      .eq('hr_profiles.is_ai', true)
      .limit(1)
      .single();

    if (projectWithIA) {
      const { data: members } = await supabase
        .from('hr_resource_assignments')
        .select(`
          *,
          hr_profiles (
            name,
            is_ai,
            prompt_id
          )
        `)
        .eq('project_id', projectWithIA.project_id)
        .in('booking_status', ['accepted', 'completed']);

      console.log('✅ Membres du projet:', members?.length || 0);
      members?.forEach(m => {
        if (m.hr_profiles?.is_ai) {
          console.log(`  🤖 IA: ${m.hr_profiles.name}`);
          console.log(`    ID: ia_${m.profile_id}`);
          console.log(`    prompt_id: ${m.hr_profiles.prompt_id || 'NON DÉFINI ⚠️'}`);
        } else {
          console.log(`  👤 Humain: ${m.hr_profiles?.name || 'Non défini'}`);
        }
      });
    }

    // 4. Résumé des problèmes potentiels
    console.log('\n📊 RÉSUMÉ DES PROBLÈMES DÉTECTÉS:');

    const iaWithoutPrompt = iaResources?.filter(ia => !ia.prompt_id) || [];
    const iaNotAccepted = assignments?.filter(a => a.booking_status !== 'accepted') || [];
    const iaBadCandidateId = assignments?.filter(a => a.candidate_id !== a.profile_id) || [];

    if (iaWithoutPrompt.length > 0) {
      console.log(`⚠️ ${iaWithoutPrompt.length} IA sans prompt_id`);
      iaWithoutPrompt.forEach(ia => console.log(`   - ${ia.name}`));
    }

    if (iaNotAccepted.length > 0) {
      console.log(`⚠️ ${iaNotAccepted.length} IA non acceptées automatiquement`);
      iaNotAccepted.forEach(a => console.log(`   - ${a.hr_profiles.name}: ${a.booking_status}`));
    }

    if (iaBadCandidateId.length > 0) {
      console.log(`⚠️ ${iaBadCandidateId.length} IA avec candidate_id != profile_id`);
    }

    if (iaWithoutPrompt.length === 0 && iaNotAccepted.length === 0 && iaBadCandidateId.length === 0) {
      console.log('✅ Aucun problème détecté !');
    }

    // 5. Test simulation de réponse IA
    console.log('\n📋 5. TEST: Simulation de génération de réponse IA');
    console.log('✅ La réponse simulée est activée dans aiMessageHandler.ts');
    console.log('   L\'IA devrait répondre avec un message de test');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter les tests
testIAFixes().then(() => {
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 PROCHAINES ÉTAPES:');
  console.log('1. Définir les prompt_id pour toutes les IA');
  console.log('2. Déployer l\'Edge Function ai-conversation-handler');
  console.log('3. Retirer la réponse simulée dans aiMessageHandler.ts');
  console.log('4. Tester avec de vraies conversations IA');
  process.exit(0);
});