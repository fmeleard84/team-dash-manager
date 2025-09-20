import { createClient } from '@supabase/supabase-js';

// Utiliser EXACTEMENT les mêmes clés que dans fix-ia-now.mjs (qui fonctionne)
const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function verify() {
  console.log('🔍 Vérification de l\'état de la base de données...\n');

  // 1. Compter tous les projets
  const { count: projectCount, error: countError } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Nombre total de projets: ${projectCount || 0}`);
  if (countError) console.log('Erreur:', countError);

  // 2. Lister les 10 derniers projets
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, title, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (projectsError) {
    console.log('❌ Erreur récupération projets:', projectsError);
  } else {
    console.log(`\n📁 ${projects?.length || 0} projets récents:`);
    projects?.forEach(p => {
      const date = new Date(p.created_at).toLocaleDateString();
      console.log(`  - "${p.title}" (status: ${p.status}, créé: ${date})`);
    });
  }

  // 3. Compter les assignments
  const { count: assignmentCount } = await supabase
    .from('hr_resource_assignments')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Nombre total d'assignments: ${assignmentCount || 0}`);

  // 4. Vérifier le candidat Francis
  const candidateId = '6cc0150b-30ef-4020-ba1b-ca20ba685310';

  const { data: candidateProfile, error: candidateError } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('id', candidateId)
    .single();

  if (candidateError) {
    console.log(`\n❌ Candidat ${candidateId} non trouvé:`, candidateError);
  } else {
    console.log(`\n✅ Candidat trouvé: ${candidateProfile.first_name} ${candidateProfile.last_name}`);
    console.log(`  - Email: ${candidateProfile.email}`);
    console.log(`  - Status: ${candidateProfile.status}`);
  }

  // 5. Assignments du candidat
  const { data: candidateAssignments, error: assignError } = await supabase
    .from('hr_resource_assignments')
    .select('*, projects(*)')
    .eq('candidate_id', candidateId);

  console.log(`\n📋 Assignments du candidat: ${candidateAssignments?.length || 0}`);
  if (candidateAssignments && candidateAssignments.length > 0) {
    candidateAssignments.forEach(a => {
      console.log(`  - Projet: "${a.projects?.title || 'N/A'}" (booking: ${a.booking_status})`);
    });
  }

  // 6. Créer un projet de test si aucun projet n'existe
  if (!projects || projects.length === 0) {
    console.log('\n⚠️ Base vide - Création d\'un projet de test...');

    // D'abord trouver un client
    const { data: clients } = await supabase
      .from('client_profiles')
      .select('id')
      .limit(1);

    if (clients && clients.length > 0) {
      const clientId = clients[0].id;

      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert({
          title: 'Projet Test IA',
          description: 'Projet de test créé automatiquement',
          status: 'play',
          owner_id: clientId,
          project_date: new Date().toISOString(),
          client_budget: 10000
        })
        .select()
        .single();

      if (createError) {
        console.log('❌ Erreur création projet:', createError);
      } else {
        console.log('✅ Projet créé:', newProject.title);

        // Créer un assignment
        const { error: assignError } = await supabase
          .from('hr_resource_assignments')
          .insert({
            project_id: newProject.id,
            candidate_id: candidateId,
            booking_status: 'accepted',
            seniority: 'senior'
          });

        if (assignError) {
          console.log('❌ Erreur création assignment:', assignError);
        } else {
          console.log('✅ Assignment créé pour Francis');
        }
      }
    } else {
      console.log('❌ Aucun client trouvé pour créer le projet');
    }
  }

  console.log('\n✅ Vérification terminée');
}

verify().catch(console.error);