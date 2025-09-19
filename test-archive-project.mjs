import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Trouver un projet actif à archiver pour test
const { data: activeProject } = await supabase
  .from('projects')
  .select('*')
  .is('archived_at', null)
  .is('deleted_at', null)
  .limit(1)
  .single();

if (activeProject) {
  console.log(`🗃️ Archivage du projet "${activeProject.title}" pour test...`);
  
  const { error } = await supabase
    .from('projects')
    .update({ 
      archived_at: new Date().toISOString(),
      status: 'completed'
    })
    .eq('id', activeProject.id);

  if (!error) {
    console.log('✅ Projet archivé avec succès');
  } else {
    console.log('❌ Erreur:', error.message);
  }
} else {
  console.log('❌ Aucun projet actif trouvé');
}
