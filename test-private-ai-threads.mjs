import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey);

async function testPrivateThreads() {
  console.log('🧪 Test des threads privés IA...\n');

  // 1. Récupérer un projet avec IA
  const { data: projects } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects!inner (
        id,
        title,
        status
      ),
      hr_profiles!inner (
        id,
        name,
        is_ai
      )
    `)
    .eq('projects.status', 'play')
    .eq('hr_profiles.is_ai', true)
    .limit(1);

  if (!projects || projects.length === 0) {
    console.log('❌ Aucun projet avec IA trouvé');
    return;
  }

  const assignment = projects[0];
  const projectId = assignment.project_id;
  const iaProfileId = assignment.profile_id;
  const iaName = assignment.hr_profiles.name;

  console.log('✅ Projet trouvé:', assignment.projects.title);
  console.log('🤖 IA trouvée:', iaName);

  // 2. Récupérer les membres humains du projet
  const { data: humanMembers } = await supabase
    .from('hr_resource_assignments')
    .select(`
      candidate_id,
      candidate_profiles!inner (
        id,
        first_name,
        email
      )
    `)
    .eq('project_id', projectId)
    .eq('booking_status', 'accepted')
    .not('candidate_id', 'is', null);

  if (!humanMembers || humanMembers.length === 0) {
    console.log('❌ Aucun membre humain dans ce projet');
    return;
  }

  console.log(`\n👥 ${humanMembers.length} membres humains trouvés`);

  // 3. Vérifier les threads privés pour chaque membre
  console.log('\n📊 Vérification des threads privés:');
  console.log('='.repeat(50));

  for (const member of humanMembers) {
    const userId = member.candidate_id;
    const userName = member.candidate_profiles.first_name;

    // Chercher un thread privé entre ce membre et l'IA
    const threadTitle = `Conversation privée avec ${iaName}`;

    const { data: thread } = await supabase
      .from('message_threads')
      .select('id, title, created_by, metadata')
      .eq('project_id', projectId)
      .eq('created_by', userId)
      .eq('title', threadTitle)
      .single();

    if (thread) {
      console.log(`\n✅ Thread privé trouvé pour ${userName}:`);
      console.log(`   - Thread ID: ${thread.id}`);
      console.log(`   - Title: ${thread.title}`);

      // Compter les messages dans ce thread
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id);

      console.log(`   - Messages: ${count || 0}`);

      // Vérifier l'isolation : est-ce que d'autres utilisateurs peuvent voir ces messages ?
      const { data: participants } = await supabase
        .from('message_participants')
        .select('user_id, email, name, role')
        .eq('thread_id', thread.id);

      console.log(`   - Participants: ${participants?.map(p => p.name).join(', ')}`);

      // Vérifier que seul ce membre et l'IA sont participants
      const isPrivate = participants?.length === 2 &&
        participants.some(p => p.user_id === userId) &&
        participants.some(p => p.role === 'ia');

      console.log(`   - Est privé: ${isPrivate ? '✅ OUI' : '❌ NON'}`);
    } else {
      console.log(`\n⚠️  Pas de thread privé pour ${userName}`);
    }
  }

  // 4. Vérifier qu'il n'y a pas de messages IA visibles dans le thread principal
  console.log('\n\n📨 Vérification de l\'isolation des messages:');
  console.log('='.repeat(50));

  // Récupérer le thread principal du projet
  const { data: mainThread } = await supabase
    .from('message_threads')
    .select('id, title')
    .eq('project_id', projectId)
    .not('title', 'like', 'Conversation privée%')
    .limit(1)
    .single();

  if (mainThread) {
    console.log(`\nThread principal: ${mainThread.title}`);

    // Chercher des messages de l'IA dans le thread principal
    const { data: iaMessages } = await supabase
      .from('messages')
      .select('content, created_at')
      .eq('thread_id', mainThread.id)
      .eq('sender_id', iaProfileId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (iaMessages && iaMessages.length > 0) {
      console.log(`⚠️  ${iaMessages.length} messages IA trouvés dans le thread principal!`);
      iaMessages.forEach(msg => {
        const preview = msg.content.substring(0, 50);
        console.log(`   - "${preview}..."`);
      });
    } else {
      console.log('✅ Aucun message IA dans le thread principal (bon!)');
    }
  }

  console.log('\n✅ Test terminé');
}

testPrivateThreads().catch(console.error);