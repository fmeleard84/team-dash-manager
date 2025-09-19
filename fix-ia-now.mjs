import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Exécution de la correction des statuts IA...\n');

// Appeler la fonction de correction
const { data, error } = await supabase.functions.invoke('fix-ia-booking-status');

if (error) {
  console.error('❌ Erreur:', error);
  process.exit(1);
}

console.log('✅ Résultat:', data);

// Vérifier le résultat sur un projet spécifique
console.log('\n📊 Vérification des projets récents...\n');

const { data: projects } = await supabase
  .from('projects')
  .select('id, name')
  .order('created_at', { ascending: false })
  .limit(3);

for (const project of projects || []) {
  console.log(`\n📋 Projet: ${project.name}`);

  const { data: resources } = await supabase
    .from('hr_resource_assignments')
    .select(`
      id,
      booking_status,
      profile_id,
      node_data,
      hr_profiles!profile_id (
        name,
        is_ai
      )
    `)
    .eq('project_id', project.id);

  if (resources) {
    resources.forEach(r => {
      const profile = r.hr_profiles;
      const isAI = profile?.is_ai || r.node_data?.is_ai;
      const icon = isAI ? '🤖' : '👤';
      const status = r.booking_status;
      const statusIcon = status === 'booké' ? '✅' : status === 'accepted' ? '🟡' : status === 'recherche' ? '🔍' : '⏸️';

      console.log(`  ${icon} ${profile?.name || 'Unknown'}: ${statusIcon} ${status} ${isAI && status !== 'booké' ? '⚠️ PROBLÈME!' : ''}`);
    });
  }
}

console.log('\n✅ Terminé!');
process.exit(0);