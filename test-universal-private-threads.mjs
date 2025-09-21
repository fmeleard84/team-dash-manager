#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

console.log('🧪 Test du système de threads privés universels\n');

async function testUniversalPrivateThreads() {
  try {
    // 1. Récupérer un projet avec des membres (humains et IA)
    console.log('1️⃣ Recherche d\'un projet avec équipe mixte...');

    const { data: projects } = await supabase
      .from('projects')
      .select(`
        *,
        hr_resource_assignments!inner (
          *,
          hr_profiles!inner (*),
          candidate_profiles (*)
        )
      `)
      .eq('status', 'play')
      .limit(1);

    if (!projects || projects.length === 0) {
      console.log('❌ Aucun projet actif trouvé');
      return;
    }

    const project = projects[0];
    console.log(`✅ Projet trouvé: "${project.title}" (${project.id})`);

    // 2. Analyser l'équipe
    const team = project.hr_resource_assignments;
    const iaMembers = team.filter(m => m.hr_profiles?.is_ai === true);
    const humanMembers = team.filter(m => m.hr_profiles?.is_ai !== true && m.candidate_profiles);

    console.log(`\n📊 Composition de l'équipe:`);
    console.log(`   - ${humanMembers.length} humains`);
    console.log(`   - ${iaMembers.length} IA`);

    if (humanMembers.length < 2) {
      console.log('⚠️ Pas assez de membres humains pour tester les conversations privées');
      return;
    }

    // 3. Tester la création de threads privés
    console.log(`\n2️⃣ Test de création de threads privés...`);

    // Thread privé humain-humain
    const user1 = humanMembers[0].candidate_profiles;
    const user2 = humanMembers[1].candidate_profiles;

    console.log(`\n💬 Test: Thread privé entre deux humains`);
    console.log(`   - ${user1.first_name} ${user1.last_name}`);
    console.log(`   - ${user2.first_name} ${user2.last_name}`);

    const threadKey1 = [user1.id, user2.id].sort().join('_');

    // Vérifier si un thread existe déjà
    const { data: existingHumanThread } = await supabase
      .from('message_threads')
      .select('*')
      .eq('project_id', project.id)
      .contains('metadata', { thread_key: threadKey1 })
      .single();

    if (existingHumanThread) {
      console.log(`   ✅ Thread existant trouvé: ${existingHumanThread.id}`);
      console.log(`      Titre: "${existingHumanThread.title}"`);
      console.log(`      Type: ${existingHumanThread.metadata?.type}`);
    } else {
      console.log(`   ℹ️ Pas de thread existant (sera créé à la première conversation)`);
    }

    // Thread privé humain-IA (si IA disponible)
    if (iaMembers.length > 0) {
      const iaMember = iaMembers[0];
      const iaProfile = iaMember.hr_profiles;

      console.log(`\n🤖 Test: Thread privé entre humain et IA`);
      console.log(`   - ${user1.first_name} ${user1.last_name}`);
      console.log(`   - ${iaProfile.name} (IA)`);

      const threadKey2 = [user1.id, iaProfile.id].sort().join('_');

      const { data: existingIAThread } = await supabase
        .from('message_threads')
        .select('*')
        .eq('project_id', project.id)
        .contains('metadata', { thread_key: threadKey2 })
        .single();

      if (existingIAThread) {
        console.log(`   ✅ Thread existant trouvé: ${existingIAThread.id}`);
        console.log(`      Titre: "${existingIAThread.title}"`);
        console.log(`      Type: ${existingIAThread.metadata?.type}`);
        console.log(`      IA conversation: ${existingIAThread.metadata?.is_ai_conversation || false}`);
      } else {
        console.log(`   ℹ️ Pas de thread existant (sera créé à la première conversation)`);
      }
    }

    // 4. Vérifier les threads de groupe
    console.log(`\n3️⃣ Vérification des threads de groupe...`);

    const { data: groupThreads } = await supabase
      .from('message_threads')
      .select('*')
      .eq('project_id', project.id)
      .eq('metadata->type', 'group');

    if (groupThreads && groupThreads.length > 0) {
      console.log(`✅ ${groupThreads.length} thread(s) de groupe trouvé(s):`);
      groupThreads.forEach(thread => {
        const participants = thread.metadata?.participants || [];
        console.log(`   - "${thread.title}" (${participants.length} participants)`);
      });
    } else {
      console.log(`ℹ️ Aucun thread de groupe pour ce projet`);
    }

    // 5. Statistiques globales
    console.log(`\n4️⃣ Statistiques des threads privés...`);

    const { data: allPrivateThreads } = await supabase
      .from('message_threads')
      .select('*')
      .eq('project_id', project.id)
      .eq('metadata->type', 'private');

    const { data: allGroupThreads } = await supabase
      .from('message_threads')
      .select('*')
      .eq('project_id', project.id)
      .eq('metadata->type', 'group');

    const { data: teamThreads } = await supabase
      .from('message_threads')
      .select('*')
      .eq('project_id', project.id)
      .or('metadata->type.eq.team,metadata->type.is.null');

    console.log(`\n📈 Résumé pour le projet "${project.title}":`);
    console.log(`   - Threads privés (1-to-1): ${allPrivateThreads?.length || 0}`);
    console.log(`   - Threads de groupe: ${allGroupThreads?.length || 0}`);
    console.log(`   - Thread principal d'équipe: ${teamThreads?.length || 0}`);

    // Détail des threads privés
    if (allPrivateThreads && allPrivateThreads.length > 0) {
      console.log(`\n   Détail des threads privés:`);
      allPrivateThreads.forEach(thread => {
        const isAI = thread.metadata?.is_ai_conversation || false;
        const participants = thread.metadata?.participants || [];
        console.log(`   • ${thread.title}`);
        console.log(`     - Type: ${isAI ? 'Conversation avec IA' : 'Conversation humaine'}`);
        console.log(`     - Participants: ${participants.map(p => p.name).join(', ')}`);
      });
    }

    console.log('\n✅ Test complété avec succès!');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Lancer le test
testUniversalPrivateThreads();