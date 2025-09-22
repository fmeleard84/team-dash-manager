import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

async function checkMessagingSystem() {
  console.log('🔍 Analyse complète du système de messagerie\n');
  console.log('='.repeat(60));

  // 1. Vérifier les threads
  console.log('\n📋 ANALYSE DES THREADS');
  console.log('-'.repeat(40));

  const { data: threads, error: threadError } = await supabase
    .from('message_threads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!threadError && threads) {
    console.log(`Total threads: ${threads.length}`);

    const privateThreads = threads.filter(t => t.metadata?.type === 'private');
    const teamThreads = threads.filter(t => t.metadata?.type === 'team' || !t.metadata?.type);

    console.log(`  - Threads privés: ${privateThreads.length}`);
    console.log(`  - Threads équipe: ${teamThreads.length}`);

    // Afficher les threads privés
    if (privateThreads.length > 0) {
      console.log('\n🔐 Threads privés détaillés:');
      for (const thread of privateThreads) {
        const participants = thread.metadata?.participants || [];
        console.log(`\n  Thread: ${thread.title}`);
        console.log(`    ID: ${thread.id}`);
        console.log(`    Projet: ${thread.project_id}`);
        console.log(`    Participants:`);
        participants.forEach(p => {
          console.log(`      - ${p.name} (${p.isAI ? '🤖 IA' : '👤 Humain'}) [${p.id}]`);
        });

        // Compter les messages dans ce thread
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('thread_id', thread.id);
        console.log(`    Messages: ${count || 0}`);
      }
    }
  } else if (threadError) {
    console.error('Erreur:', threadError);
  }

  // 2. Vérifier les messages récents avec IA
  console.log('\n💬 MESSAGES RÉCENTS AVEC IA');
  console.log('-'.repeat(40));

  const { data: iaMessages, error: iaError } = await supabase
    .from('messages')
    .select('*')
    .or('sender_email.ilike.%@ia.team,content.ilike.%@ia%')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!iaError && iaMessages) {
    console.log(`Messages IA trouvés: ${iaMessages.length}`);

    for (const msg of iaMessages) {
      // Récupérer le thread pour voir s'il est privé
      const { data: thread } = await supabase
        .from('message_threads')
        .select('metadata')
        .eq('id', msg.thread_id)
        .single();

      const isPrivate = thread?.metadata?.type === 'private';
      const preview = msg.content.substring(0, 80).replace(/\n/g, ' ');

      console.log(`\n  ${msg.sender_name}:`);
      console.log(`    Thread: ${isPrivate ? '🔒 PRIVÉ' : '📢 PUBLIC'}`);
      console.log(`    Contenu: "${preview}..."`);
      console.log(`    Date: ${new Date(msg.created_at).toLocaleString()}`);
    }
  }

  // 3. Vérifier les profils IA et leurs associations
  console.log('\n🤖 PROFILS IA ET ASSOCIATIONS');
  console.log('-'.repeat(40));

  const { data: iaProfiles } = await supabase
    .from('hr_profiles')
    .select(\`
      id,
      name,
      is_ai,
      prompt_id,
      hr_resource_assignments!inner (
        project_id,
        candidate_id,
        booking_status
      )
    \`)
    .eq('is_ai', true);

  if (iaProfiles) {
    console.log(`Profils IA trouvés: ${iaProfiles.length}`);

    for (const ia of iaProfiles) {
      console.log(`\n  ${ia.name}:`);
      console.log(`    ID: ${ia.id}`);
      console.log(`    Prompt configuré: ${ia.prompt_id ? '✅' : '❌'}`);
      console.log(`    Projets assignés: ${ia.hr_resource_assignments?.length || 0}`);

      if (ia.hr_resource_assignments?.length > 0) {
        for (const assignment of ia.hr_resource_assignments) {
          console.log(`      - Projet: ${assignment.project_id}`);
          console.log(`        Candidat ID: ${assignment.candidate_id || 'NON DÉFINI'}`);
          console.log(`        Statut: ${assignment.booking_status}`);
        }
      }
    }
  }

  // 4. Analyser les problèmes potentiels
  console.log('\n⚠️  PROBLÈMES DÉTECTÉS');
  console.log('-'.repeat(40));

  let problemsFound = false;

  // Vérifier les threads privés sans metadata correcte
  const { data: badThreads } = await supabase
    .from('message_threads')
    .select('id, title')
    .like('title', '%Conversation privée%')
    .is('metadata', null);

  if (badThreads && badThreads.length > 0) {
    problemsFound = true;
    console.log(`\n❌ Threads privés sans metadata: ${badThreads.length}`);
    badThreads.forEach(t => console.log(`  - ${t.title}`));
  }

  // Vérifier les messages orphelins
  const { data: allMessages } = await supabase
    .from('messages')
    .select('thread_id')
    .limit(100);

  const { data: allThreads } = await supabase
    .from('message_threads')
    .select('id');

  if (allMessages && allThreads) {
    const threadIds = new Set(allThreads.map(t => t.id));
    const orphans = allMessages.filter(m => !threadIds.has(m.thread_id));

    if (orphans.length > 0) {
      problemsFound = true;
      console.log(`\n❌ Messages orphelins (thread inexistant): ${orphans.length}`);
    }
  }

  // Vérifier les IA sans prompt
  if (iaProfiles) {
    const iaWithoutPrompt = iaProfiles.filter(ia => !ia.prompt_id);
    if (iaWithoutPrompt.length > 0) {
      problemsFound = true;
      console.log(`\n❌ IA sans prompt configuré: ${iaWithoutPrompt.length}`);
      iaWithoutPrompt.forEach(ia => console.log(`  - ${ia.name}`));
    }
  }

  if (!problemsFound) {
    console.log('\n✅ Aucun problème majeur détecté');
  }

  console.log('\n' + '='.repeat(60));
  process.exit(0);
}

checkMessagingSystem().catch(console.error);
