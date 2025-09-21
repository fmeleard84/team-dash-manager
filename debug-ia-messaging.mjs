import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function debugIAMessaging() {
  const projectId = 'd2c755c5-8ef7-4bac-830f-1750a6cc6b9c'; // ID from logs
  const threadId = '8a1d7723-e4b2-4e4b-b63c-177fa797ec07'; // ID from logs
  const clientId = '8a1f0522-7c13-4bb9-8bdf-8c6e6f80228a'; // ID from logs

  console.log('🔍 Analyse du problème de messagerie IA\n');
  console.log('=' .repeat(50));

  // 1. Vérifier le projet
  console.log('\n1️⃣ Projet:');
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (!project) {
    console.log('❌ Projet non trouvé');
    return;
  }

  console.log('✅ Titre:', project.title);
  console.log('   Status:', project.status);
  console.log('   Owner:', project.owner_id);

  // 2. Vérifier les ressources assignées
  console.log('\n2️⃣ Ressources assignées:');
  const { data: assignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      hr_profiles (
        id,
        name,
        is_ai,
        prompt_id
      ),
      candidate_profiles (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('project_id', projectId);

  if (!assignments || assignments.length === 0) {
    console.log('❌ Aucune ressource assignée');
    return;
  }

  console.log(`✅ ${assignments.length} ressource(s) trouvée(s):`);

  let iaResource = null;
  let candidateResource = null;

  assignments.forEach(a => {
    const isIA = a.hr_profiles?.is_ai;
    const icon = isIA ? '🤖' : '👤';

    console.log(`\n   ${icon} ${a.hr_profiles?.name}`);
    console.log(`      - profile_id: ${a.profile_id}`);
    console.log(`      - candidate_id: ${a.candidate_id || '❌ NULL'}`);
    console.log(`      - booking_status: ${a.booking_status}`);

    if (isIA) {
      iaResource = a;
      console.log(`      - prompt_id: ${a.hr_profiles?.prompt_id || '❌ NULL'}`);

      // Vérifier le profil candidat de l'IA
      if (a.candidate_profiles) {
        console.log(`      - Email IA: ${a.candidate_profiles.email}`);
        console.log(`      - Nom IA: ${a.candidate_profiles.first_name} ${a.candidate_profiles.last_name}`);
      } else {
        console.log(`      - ❌ Pas de profil candidat pour l'IA`);
      }
    } else if (a.candidate_id) {
      candidateResource = a;
    }
  });

  // 3. Analyser le problème de l'IA
  console.log('\n3️⃣ Diagnostic IA:');

  if (!iaResource) {
    console.log('❌ Aucune ressource IA dans ce projet');
    return;
  }

  const iaProblems = [];

  if (iaResource.booking_status !== 'accepted') {
    iaProblems.push(`booking_status est "${iaResource.booking_status}" au lieu de "accepted"`);
  }

  if (!iaResource.candidate_id) {
    iaProblems.push('candidate_id est NULL');
  } else if (iaResource.candidate_id !== iaResource.profile_id) {
    iaProblems.push(`candidate_id (${iaResource.candidate_id}) ≠ profile_id (${iaResource.profile_id})`);
  }

  if (!iaResource.hr_profiles?.prompt_id) {
    iaProblems.push('prompt_id non configuré');
  }

  if (iaProblems.length > 0) {
    console.log('❌ Problèmes détectés:');
    iaProblems.forEach(p => console.log(`   - ${p}`));
    console.log('\n💡 Solution: Re-sauvegarder le projet dans ReactFlow');
  } else {
    console.log('✅ Configuration IA correcte');
  }

  // 4. Vérifier les messages récents
  console.log('\n4️⃣ Messages récents:');
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (messages && messages.length > 0) {
    console.log(`✅ ${messages.length} message(s) trouvé(s):`);
    messages.forEach(m => {
      const preview = m.content.substring(0, 50);
      console.log(`   - [${m.sender_name}]: ${preview}...`);
      console.log(`     Metadata: ${JSON.stringify(m.metadata || {})}`);
    });
  } else {
    console.log('❌ Aucun message dans ce thread');
  }

  // 5. Vérifier pourquoi le candidat ne voit pas l'IA
  console.log('\n5️⃣ Visibilité côté candidat:');

  if (!candidateResource) {
    console.log('❌ Aucun candidat humain dans ce projet');
  } else {
    console.log('✅ Candidat trouvé:', candidateResource.candidate_profiles?.first_name);
    console.log('   ID:', candidateResource.candidate_id);

    // Simuler ce que useProjectMembersForMessaging retourne
    console.log('\n   Ce que le hook devrait retourner:');

    const allMembers = [];

    // Ajouter le client
    allMembers.push({
      id: project.owner_id,
      role: 'client',
      name: 'Client'
    });

    // Ajouter les ressources acceptées
    assignments.forEach(a => {
      if (a.booking_status === 'accepted' && a.candidate_id) {
        const isAI = a.hr_profiles?.is_ai;
        allMembers.push({
          id: isAI ? `ia_${a.profile_id}` : a.candidate_id,
          role: isAI ? 'ia' : 'candidate',
          name: a.hr_profiles?.name,
          isAI: isAI
        });
      }
    });

    console.log('   Membres avant filtrage:', allMembers.map(m => `${m.name} (${m.role})`).join(', '));

    // Simuler le filtrage côté candidat
    const filteredForCandidate = allMembers.filter(m => {
      if (m.isAI) return true; // Toujours montrer les IA
      return m.id !== candidateResource.candidate_id; // Filtrer le candidat actuel
    });

    console.log('   Membres après filtrage (côté candidat):',
      filteredForCandidate.map(m => `${m.name} (${m.role})`).join(', '));

    if (!filteredForCandidate.find(m => m.isAI)) {
      console.log('   ❌ L\'IA n\'apparaît pas après filtrage !');
    }
  }

  // 6. Résumé final
  console.log('\n' + '=' .repeat(50));
  console.log('\n📊 RÉSUMÉ DU DIAGNOSTIC:\n');

  if (iaProblems.length > 0) {
    console.log('❌ L\'IA ne peut pas répondre car:');
    iaProblems.forEach(p => console.log(`   - ${p}`));
  } else {
    console.log('✅ L\'IA devrait pouvoir répondre');
    console.log('\n⚠️  Vérifier:');
    console.log('   1. Les Edge Functions sont-elles déployées ?');
    console.log('   2. La clé OpenAI est-elle configurée ?');
    console.log('   3. Le prompt_id existe-t-il dans prompts_ia ?');
  }

  if (!filteredForCandidate?.find(m => m.isAI)) {
    console.log('\n❌ L\'IA n\'est pas visible côté candidat');
    console.log('   Problème possible: booking_status ou candidate_id');
  }
}

debugIAMessaging().catch(console.error);