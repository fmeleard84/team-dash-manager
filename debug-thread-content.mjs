import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const threadId = 'd79ed4fa-08c3-4b29-bbec-e92636591ae1';

console.log('🔍 Analyse du thread:', threadId);

// Récupérer le thread
const { data: thread, error } = await supabase
  .from('message_threads')
  .select('*')
  .eq('id', threadId)
  .single();

if (error) {
  console.error('❌ Erreur:', error);
  process.exit(1);
}

console.log('\n📋 Thread trouvé:');
console.log('- Titre:', thread.title);
console.log('- Type:', thread.metadata?.type);
console.log('- Privé:', thread.metadata?.is_private);

console.log('\n👥 Participants:');
const participants = thread.metadata?.participants || [];
for (const [i, p] of participants.entries()) {
  console.log(`\nParticipant ${i + 1}:`);
  console.log('  - ID:', p.id);
  console.log('  - Nom:', p.name);
  console.log('  - Email:', p.email);
  console.log('  - isAI:', p.isAI);
  console.log('  - Type isAI:', typeof p.isAI);
  console.log('  - Role:', p.role);
  console.log('  - PromptId:', p.promptId);

  // Vérifier si c'est une IA dans hr_profiles
  if (p.id) {
    const { data: hrProfile } = await supabase
      .from('hr_profiles')
      .select('id, name, is_ai, prompt_id')
      .eq('id', p.id)
      .single();

    if (hrProfile) {
      console.log('  📊 Dans hr_profiles:');
      console.log('    - is_ai:', hrProfile.is_ai);
      console.log('    - prompt_id:', hrProfile.prompt_id);
    }
  }
}

// Proposer une correction
console.log('\n\n💡 Correction proposée:');
const fixedParticipants = [];
for (const p of participants) {
  const { data: hrProfile } = await supabase
    .from('hr_profiles')
    .select('id, name, is_ai, prompt_id')
    .eq('id', p.id)
    .maybeSingle();

  if (hrProfile?.is_ai) {
    fixedParticipants.push({
      ...p,
      isAI: true,
      promptId: hrProfile.prompt_id
    });
    console.log(`✅ ${p.name} devrait avoir isAI: true`);
  } else {
    fixedParticipants.push(p);
  }
}

// Appliquer la correction ?
console.log('\n🔧 Application de la correction...');
const { error: updateError } = await supabase
  .from('message_threads')
  .update({
    metadata: {
      ...thread.metadata,
      participants: fixedParticipants
    }
  })
  .eq('id', threadId);

if (updateError) {
  console.error('❌ Erreur lors de la mise à jour:', updateError);
} else {
  console.log('✅ Thread corrigé avec succès !');
  console.log('Nouveaux participants:', fixedParticipants);
}