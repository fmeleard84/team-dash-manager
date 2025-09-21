import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function testIAMessaging() {
  console.log('🔧 Test du système de messagerie IA\n');
  console.log('=' .repeat(50));

  // 1. Chercher un projet avec des ressources IA
  console.log('\n1️⃣ Recherche d\'un projet avec ressources IA...');

  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      status,
      hr_resource_assignments!inner (
        id,
        profile_id,
        candidate_id,
        booking_status,
        hr_profiles!inner (
          id,
          name,
          is_ai,
          prompt_id
        )
      )
    `)
    .eq('hr_resource_assignments.booking_status', 'accepted')
    .eq('hr_resource_assignments.hr_profiles.is_ai', true)
    .limit(1);

  if (!projects || projects.length === 0) {
    console.log('❌ Aucun projet avec ressources IA trouvé');
    console.log('\n💡 Créez un projet avec une ressource IA assignée et acceptée');
    return;
  }

  const project = projects[0];
  const iaAssignment = project.hr_resource_assignments.find(a => a.hr_profiles?.is_ai);

  console.log('✅ Projet trouvé:', project.title);
  console.log('   - ID:', project.id);
  console.log('   - Status:', project.status);
  console.log('   - IA:', iaAssignment?.hr_profiles?.name);

  // 2. Vérifier la configuration de l'IA
  console.log('\n2️⃣ Vérification de la configuration IA...');

  if (!iaAssignment?.candidate_id) {
    console.log('❌ candidate_id manquant pour l\'IA');
    console.log('   Solution: Re-sauvegarder le projet dans ReactFlow');
    return;
  }

  if (iaAssignment.candidate_id !== iaAssignment.profile_id) {
    console.log('⚠️  candidate_id différent de profile_id');
    console.log('   candidate_id:', iaAssignment.candidate_id);
    console.log('   profile_id:', iaAssignment.profile_id);
  } else {
    console.log('✅ candidate_id = profile_id (configuration correcte)');
  }

  if (!iaAssignment.hr_profiles?.prompt_id) {
    console.log('❌ prompt_id manquant pour l\'IA');
    console.log('   Solution: Configurer le prompt dans /admin');
    return;
  }

  console.log('✅ prompt_id configuré:', iaAssignment.hr_profiles.prompt_id);

  // 3. Vérifier les threads de messages
  console.log('\n3️⃣ Vérification des threads de messages...');

  const { data: threads } = await supabase
    .from('message_threads')
    .select('*')
    .eq('project_id', project.id);

  if (!threads || threads.length === 0) {
    console.log('❌ Aucun thread de messages trouvé');
    console.log('   Solution: Ouvrir la messagerie pour initialiser le thread');
    return;
  }

  console.log('✅', threads.length, 'thread(s) trouvé(s)');

  // 4. Vérifier les prompts IA
  console.log('\n4️⃣ Vérification du prompt IA...');

  const { data: prompt } = await supabase
    .from('prompts_ia')
    .select('*')
    .eq('id', iaAssignment.hr_profiles.prompt_id)
    .eq('active', true)
    .single();

  if (!prompt) {
    console.log('❌ Prompt IA non trouvé ou inactif');
    return;
  }

  console.log('✅ Prompt actif:', prompt.name);
  console.log('   - Context:', prompt.context);
  console.log('   - Prompt length:', prompt.prompt?.length || 0, 'caractères');

  // Résumé final
  console.log('\n' + '=' .repeat(50));
  console.log('\n✅ SYSTÈME PRÊT POUR LES TESTS\n');
  console.log('Instructions pour tester:');
  console.log('1. Ouvrir le projet "' + project.title + '" dans la messagerie');
  console.log('2. Sélectionner l\'IA "' + iaAssignment.hr_profiles.name + '" dans la liste');
  console.log('3. Envoyer un message comme "Créer un article sur..." ou "Salut !"');
  console.log('4. L\'IA devrait répondre automatiquement');
  console.log('\nPour une demande de création:');
  console.log('- L\'IA demandera si vous voulez un livrable ou une réponse directe');
  console.log('- Répondez "1" ou "livrable" pour un document Word');
  console.log('- Répondez "2" ou "direct" pour une réponse dans le chat');
}

testIAMessaging().catch(console.error);