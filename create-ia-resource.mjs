import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function createIAResource() {
  console.log('🤖 Création d\'une ressource IA de test...\n');

  // 1. Récupérer la catégorie Content
  const { data: categories } = await supabase
    .from('hr_categories')
    .select('*')
    .ilike('name', '%content%');

  let categoryId;
  if (categories && categories.length > 0) {
    categoryId = categories[0].id;
    console.log(`✅ Catégorie trouvée: ${categories[0].name}`);
  } else {
    // Créer la catégorie Content
    const { data: newCategory } = await supabase
      .from('hr_categories')
      .insert({ name: 'Content' })
      .select()
      .single();

    categoryId = newCategory.id;
    console.log('✅ Catégorie Content créée');
  }

  // 2. Créer une ressource IA
  const { data: iaProfile, error } = await supabase
    .from('hr_profiles')
    .insert({
      name: 'Rédacteur IA',
      category_id: categoryId,
      base_price: 1.5, // €/min
      is_ai: true
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Erreur lors de la création:', error);
    return;
  }

  console.log(`\n✅ Ressource IA créée: ${iaProfile.name}`);
  console.log(`   ID: ${iaProfile.id}`);
  console.log(`   Prix: ${iaProfile.base_price}€/min`);

  // 3. Vérifier si le profil candidat a été créé par le trigger
  const { data: candidateProfile } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('id', iaProfile.id)
    .single();

  if (candidateProfile) {
    console.log('\n✅ Profil candidat IA créé automatiquement:');
    console.log(`   Nom: ${candidateProfile.first_name} ${candidateProfile.last_name}`);
    console.log(`   Email: ${candidateProfile.email}`);
    console.log(`   Statut: ${candidateProfile.status}`);
    console.log(`   Tarif journalier: ${candidateProfile.daily_rate}€/jour`);
  } else {
    console.log('\n⚠️ Le profil candidat n\'a pas été créé automatiquement');
  }

  // 4. Assigner cette IA au projet "Projet new key"
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .ilike('title', '%new%key%')
    .single();

  if (project) {
    console.log(`\n📋 Projet trouvé: "${project.title}"`);

    // Créer une assignation
    const { data: assignment, error: assignError } = await supabase
      .from('hr_resource_assignments')
      .insert({
        project_id: project.id,
        profile_id: iaProfile.id,
        booking_status: 'recherche',
        seniority: 'senior'
      })
      .select()
      .single();

    if (assignError) {
      console.error('❌ Erreur lors de l\'assignation:', assignError);
    } else {
      console.log('✅ IA assignée au projet');

      // Attendre un peu pour que le trigger s'exécute
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Vérifier si l'auto-acceptation a fonctionné
      const { data: updatedAssignment } = await supabase
        .from('hr_resource_assignments')
        .select('*')
        .eq('id', assignment.id)
        .single();

      if (updatedAssignment?.booking_status === 'accepted' && updatedAssignment?.candidate_id) {
        console.log('✅ Auto-acceptation réussie!');
        console.log(`   Statut: ${updatedAssignment.booking_status}`);
        console.log(`   Candidate ID: ${updatedAssignment.candidate_id}`);
      } else {
        console.log('⚠️ L\'auto-acceptation n\'a pas fonctionné');
        console.log(`   Statut: ${updatedAssignment?.booking_status}`);
        console.log(`   Candidate ID: ${updatedAssignment?.candidate_id || 'NULL'}`);
      }
    }
  }
}

createIAResource().catch(console.error);
