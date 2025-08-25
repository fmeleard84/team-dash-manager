import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjI0OTIyNSwiZXhwIjoyMDM3ODI1MjI1fQ.tpbICL5m4fSm5T-ow7s0PO1SyJKdEmZNvocRuNalgrE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupTestProjects() {
  console.log('🧹 NETTOYAGE DES PROJETS DE TEST');
  console.log('=====================================\n');
  
  // Projets de test à nettoyer
  const testProjectTitles = ['Mon projet perso', 'Test 2', 'test6', 'test 6'];
  
  for (const title of testProjectTitles) {
    console.log(`\n📁 Traitement du projet: "${title}"`);
    
    // Récupérer les assignments de ce projet
    const { data: assignments, error: fetchError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        projects!inner(title)
      `)
      .eq('projects.title', title)
      .eq('booking_status', 'recherche')
      .is('candidate_id', null);
    
    if (fetchError) {
      console.error(`  ❌ Erreur: ${fetchError.message}`);
      continue;
    }
    
    if (!assignments || assignments.length === 0) {
      console.log(`  ℹ️ Aucun assignment en recherche trouvé`);
      continue;
    }
    
    console.log(`  📊 ${assignments.length} assignment(s) trouvé(s)`);
    
    // Option 1: Passer en draft pour les cacher
    const { error: updateError } = await supabase
      .from('hr_resource_assignments')
      .update({ booking_status: 'draft' })
      .in('id', assignments.map(a => a.id));
    
    if (updateError) {
      console.error(`  ❌ Erreur mise à jour: ${updateError.message}`);
    } else {
      console.log(`  ✅ Assignments passés en statut "draft" (cachés)`);
    }
  }
  
  console.log('\n=====================================');
  console.log('✅ NETTOYAGE TERMINÉ');
}

cleanupTestProjects().catch(console.error);