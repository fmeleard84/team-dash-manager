import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function checkProjetIA() {
  console.log('🔍 Recherche du "Projet avec IA"...\n');

  // 1. Trouver le projet - essayer avec ilike pour être moins strict
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .ilike('title', '%avec%IA%');

  const project = projects && projects.length > 0 ? projects[0] : null;

  if (!project) {
    console.log('❌ Projet "Projet avec IA" non trouvé');

    // Lister tous les projets récents
    const { data: allProjects } = await supabase
      .from('projects')
      .select('title, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('\n📋 Projets récents:');
    allProjects?.forEach(p => console.log(`   - ${p.title}`));
    return;
  }

  console.log('✅ Projet trouvé !');
  console.log(`   - Titre: ${project.title}`);
  console.log(`   - ID: ${project.id}`);
  console.log(`   - Status: ${project.status}`);
  console.log(`   - Créé: ${new Date(project.created_at).toLocaleString()}`);

  // 2. Vérifier les ressources assignées
  const { data: assignments } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      hr_profiles (
        id,
        name,
        is_ai,
        base_price
      ),
      candidate_profiles (
        id,
        first_name,
        last_name,
        email,
        status
      )
    `)
    .eq('project_id', project.id);

  console.log(`\n👥 Équipe (${assignments?.length || 0} membres):`);

  if (!assignments || assignments.length === 0) {
    console.log('   ❌ Aucune ressource assignée');
    return;
  }

  assignments.forEach(assignment => {
    const isIA = assignment.hr_profiles?.is_ai;
    const icon = isIA ? '🤖' : '👤';
    const profileName = assignment.hr_profiles?.name || 'N/A';

    console.log(`\n   ${icon} ${profileName}`);
    console.log(`      - Profile ID: ${assignment.profile_id}`);
    console.log(`      - Booking status: ${assignment.booking_status}`);
    console.log(`      - Candidate ID: ${assignment.candidate_id || '❌ NULL (PROBLÈME!)'}`);

    if (assignment.candidate_profiles) {
      console.log(`      - Candidat: ${assignment.candidate_profiles.first_name} ${assignment.candidate_profiles.last_name}`);
      console.log(`      - Email: ${assignment.candidate_profiles.email}`);
    } else {
      console.log(`      - ❌ Pas de profil candidat trouvé`);
    }

    if (isIA) {
      if (assignment.booking_status === 'accepted' && assignment.candidate_id === assignment.profile_id) {
        console.log(`      ✅ Configuration IA correcte`);
      } else {
        console.log(`      ⚠️ Configuration IA incorrecte`);
        if (assignment.booking_status !== 'accepted') {
          console.log(`         - Le booking devrait être 'accepted' (actuellement: ${assignment.booking_status})`);
        }
        if (assignment.candidate_id !== assignment.profile_id) {
          console.log(`         - candidate_id devrait être égal à profile_id`);
        }
      }
    }
  });

  // 3. Vérifier spécifiquement l'IA
  const iaAssignments = assignments.filter(a => a.hr_profiles?.is_ai);

  console.log('\n' + '='.repeat(50));
  if (iaAssignments.length > 0) {
    const iaOK = iaAssignments.every(a =>
      a.booking_status === 'accepted' &&
      a.candidate_id === a.profile_id
    );

    if (iaOK) {
      console.log('✅ Les ressources IA sont correctement configurées');
      console.log('Elles devraient apparaître dans la messagerie !');
    } else {
      console.log('❌ Problème de configuration pour les ressources IA');
      console.log('Vérifiez les triggers auto_accept_ia_bookings et create_ia_candidate_profile_trigger');
    }
  } else {
    console.log('⚠️ Aucune ressource IA trouvée dans ce projet');
  }
}

checkProjetIA().catch(console.error);