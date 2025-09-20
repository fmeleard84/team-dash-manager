import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function checkWithServiceKey() {
  const userId = '6cc0150b-30ef-4020-ba1b-ca20ba685310';

  console.log('🔍 Vérification avec SERVICE KEY (contourne RLS)...\n');

  // 1. Vérifier les projets récents
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, status, owner_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('📁 Projets récents (sans RLS):');
  if (projects && projects.length > 0) {
    projects.forEach(p => {
      const ownerPreview = p.owner_id ? p.owner_id.substring(0,8) : 'null';
      console.log(`  - "${p.title}" (status: ${p.status}, owner: ${ownerPreview}...)`);
    });

    // Chercher spécifiquement "Projet New key"
    const newKey = projects.find(p => p.title.includes('New') || p.title.includes('key'));
    if (newKey) {
      console.log(`\n✅ TROUVÉ: "${newKey.title}" (ID: ${newKey.id})`);

      // Vérifier les assignments
      const { data: assignments } = await supabase
        .from('hr_resource_assignments')
        .select('*')
        .eq('project_id', newKey.id);

      console.log(`Assignments sur ce projet: ${assignments?.length || 0}`);
      if (assignments && assignments.length > 0) {
        assignments.forEach(a => {
          const isOur = a.candidate_id === userId;
          console.log(`  - candidate_id: ${a.candidate_id}, booking: ${a.booking_status}${isOur ? ' ✅ NOTRE CANDIDAT' : ''}`);
          console.log(`    profile_id: ${a.profile_id}`);
        });

        // Si notre candidat est assigné, vérifier le profile
        const ourAssignment = assignments.find(a => a.candidate_id === userId);
        if (ourAssignment) {
          console.log('\n🔍 Analyse du problème "Non défini":');
          console.log('  profile_id dans assignment:', ourAssignment.profile_id);

          if (ourAssignment.profile_id) {
            const { data: profile } = await supabase
              .from('hr_profiles')
              .select('*')
              .eq('id', ourAssignment.profile_id)
              .single();

            if (profile) {
              console.log('  hr_profiles trouvé:');
              console.log('    - name:', profile.name);
              console.log('    - label:', profile.label || 'NULL');
              console.log('    - category_id:', profile.category_id);
            } else {
              console.log('  ❌ hr_profiles introuvable pour ID:', ourAssignment.profile_id);
            }
          } else {
            console.log('  ❌ profile_id est NULL dans assignment');
          }
        }
      }
    }
  } else {
    console.log('  Aucun projet trouvé');
  }

  // 2. Vérifier tous les assignments du candidat
  console.log('\n📊 Assignments du candidat (sans RLS):');
  const { data: userAssignments } = await supabase
    .from('hr_resource_assignments')
    .select('*')
    .eq('candidate_id', userId);

  console.log(`Total trouvés: ${userAssignments?.length || 0}`);
  if (userAssignments && userAssignments.length > 0) {
    for (const a of userAssignments) {
      const { data: project } = await supabase
        .from('projects')
        .select('title, status')
        .eq('id', a.project_id)
        .single();

      const title = project ? project.title : 'N/A';
      const status = project ? project.status : 'N/A';
      console.log(`  - Projet: "${title}", status: ${status}, booking: ${a.booking_status}`);
    }
  }
}

checkWithServiceKey().catch(console.error);