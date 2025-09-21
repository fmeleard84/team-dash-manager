import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey);

async function fixIABookingStatus() {
  console.log('🔧 Correction du booking_status des ressources IA\n');

  // 1. Trouver toutes les ressources IA
  const { data: iaAssignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      hr_profiles!inner (
        id,
        name,
        is_ai
      )
    `)
    .eq('hr_profiles.is_ai', true);

  if (!iaAssignments || iaAssignments.length === 0) {
    console.log('❌ Aucune ressource IA trouvée');
    return;
  }

  console.log(`📊 ${iaAssignments.length} ressource(s) IA trouvée(s)\n`);

  let updated = 0;
  let needsFix = 0;

  for (const assignment of iaAssignments) {
    console.log(`🤖 ${assignment.hr_profiles.name}:`);
    console.log(`   - Project: ${assignment.project_id}`);
    console.log(`   - Profile ID: ${assignment.profile_id}`);
    console.log(`   - Candidate ID: ${assignment.candidate_id || '❌ NULL'}`);
    console.log(`   - Booking status: ${assignment.booking_status}`);

    const problems = [];

    if (assignment.booking_status !== 'accepted') {
      problems.push(`booking_status est "${assignment.booking_status}" au lieu de "accepted"`);
    }

    if (!assignment.candidate_id || assignment.candidate_id !== assignment.profile_id) {
      problems.push(`candidate_id incorrect (${assignment.candidate_id} != ${assignment.profile_id})`);
    }

    if (problems.length > 0) {
      needsFix++;
      console.log(`   ⚠️  Problèmes: ${problems.join(', ')}`);

      // Corriger
      const { error } = await supabase
        .from('hr_resource_assignments')
        .update({
          booking_status: 'accepted',
          candidate_id: assignment.profile_id
        })
        .eq('id', assignment.id);

      if (error) {
        console.log(`   ❌ Erreur lors de la correction: ${error.message}`);
      } else {
        updated++;
        console.log(`   ✅ Corrigé !`);
      }
    } else {
      console.log(`   ✅ Configuration correcte`);
    }

    console.log('');
  }

  console.log('=' .repeat(50));
  console.log(`\n📊 Résumé:`);
  console.log(`   - Total IA: ${iaAssignments.length}`);
  console.log(`   - À corriger: ${needsFix}`);
  console.log(`   - Corrigées: ${updated}`);

  if (updated > 0) {
    console.log('\n✅ Les ressources IA ont été corrigées !');
    console.log('Elles devraient maintenant apparaître dans la messagerie.');
  }
}

fixIABookingStatus().catch(console.error);