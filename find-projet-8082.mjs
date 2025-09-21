import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey);

async function findProjet8082() {
  // Chercher tous les projets récents
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, status, created_at, owner_id')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('📊 Projets récents:\n');

  projects?.forEach(p => {
    console.log(`${p.title}`);
    console.log(`  - ID: ${p.id}`);
    console.log(`  - Status: ${p.status}`);
    console.log(`  - Created: ${new Date(p.created_at).toLocaleString()}`);
    console.log('');
  });

  // Chercher spécifiquement les projets avec IA
  console.log('=' .repeat(50));
  console.log('\n🤖 Projets avec ressources IA:\n');

  const { data: iaProjects } = await supabase
    .from('hr_resource_assignments')
    .select(`
      project_id,
      projects!inner (
        id,
        title,
        status
      ),
      hr_profiles!inner (
        name,
        is_ai
      )
    `)
    .eq('hr_profiles.is_ai', true);

  const uniqueProjects = new Map();

  iaProjects?.forEach(a => {
    if (!uniqueProjects.has(a.project_id)) {
      uniqueProjects.set(a.project_id, {
        ...a.projects,
        iaName: a.hr_profiles.name
      });
    }
  });

  uniqueProjects.forEach(p => {
    console.log(`${p.title}`);
    console.log(`  - ID: ${p.id}`);
    console.log(`  - Status: ${p.status}`);
    console.log(`  - IA: ${p.iaName}`);
    console.log('');
  });

  if (uniqueProjects.size === 0) {
    console.log('❌ Aucun projet avec IA trouvé');
  }
}

findProjet8082().catch(console.error);