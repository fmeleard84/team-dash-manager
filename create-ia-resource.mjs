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
  console.log('🤖 Création d\'une ressource IA Rédacteur...\n');

  try {
    // 1. Trouver la catégorie Marketing/Communication
    let { data: category } = await supabase
      .from('hr_categories')
      .select('*')
      .ilike('name', '%marketing%')
      .single();

    if (!category) {
      // Créer la catégorie si elle n'existe pas
      const { data: newCategory, error } = await supabase
        .from('hr_categories')
        .insert({
          name: 'Marketing & Communication'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur création catégorie:', error);
        return;
      }
      category = newCategory;
    }

    console.log('✅ Catégorie:', category.name);

    // 2. Créer un prompt IA si nécessaire
    const { data: existingPrompt } = await supabase
      .from('prompts_ia')
      .select('*')
      .eq('id', 'redacteur_contenu')
      .single();

    if (!existingPrompt) {
      const { error: promptError } = await supabase
        .from('prompts_ia')
        .insert({
          id: 'redacteur_contenu',
          name: 'IA Rédacteur de Contenu',
          context: 'content-creation',
          prompt: `Tu es un rédacteur professionnel spécialisé dans la création de contenu marketing et éditorial.
Tu maîtrises parfaitement le français et tu adaptes ton style selon les besoins du projet.
Tes compétences incluent :
- Rédaction d'articles de blog et de pages web
- Création de contenus SEO optimisés
- Rédaction de newsletters et emails marketing
- Conception de supports de communication
- Storytelling et copywriting

Tu fournis toujours un contenu structuré, engageant et adapté à la cible visée.`,
          active: true,
          priority: 1
        });

      if (promptError) {
        console.error('❌ Erreur création prompt:', promptError);
        return;
      }
      console.log('✅ Prompt IA créé');
    }

    // 3. Créer le profil hr_profiles pour l'IA
    const iaProfileId = crypto.randomUUID();

    const { data: hrProfile, error: hrError } = await supabase
      .from('hr_profiles')
      .insert({
        id: iaProfileId,
        name: 'IA Rédacteur',
        category_id: category.id,
        is_ai: true,
        prompt_id: 'redacteur_contenu',
        base_price: 350 // Prix journalier IA
      })
      .select()
      .single();

    if (hrError) {
      console.error('❌ Erreur création hr_profile:', hrError);
      return;
    }

    console.log('✅ Profil HR créé:', hrProfile.name, '(ID:', hrProfile.id, ')');

    // 4. Créer le profil candidat associé (même ID)
    const { error: candidateError } = await supabase
      .from('candidate_profiles')
      .insert({
        id: iaProfileId, // MÊME ID que hr_profiles
        first_name: 'IA',
        last_name: 'Rédacteur',
        email: 'ia_redacteur@ia.team',
        phone: '+33000000000',
        status: 'disponible',
        qualification_status: 'qualified',
        daily_rate: 350,
        technical_skills: ['Rédaction', 'SEO', 'Marketing', 'Storytelling'],
        soft_skills: ['Créativité', 'Adaptation', 'Synthèse'],
        languages: ['Français', 'Anglais'],
        seniority: 'expert'
      });

    if (candidateError) {
      console.error('❌ Erreur création candidate_profile:', candidateError);
      // Nettoyer hr_profile créé
      await supabase.from('hr_profiles').delete().eq('id', iaProfileId);
      return;
    }

    console.log('✅ Profil candidat IA créé');

    // 5. Créer aussi un profil utilisateur (profiles) pour la compatibilité
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: iaProfileId, // MÊME ID
        email: 'ia_redacteur@ia.team',
        first_name: 'IA Rédacteur',
        role: 'candidate'
      });

    if (profileError && !profileError.message.includes('duplicate')) {
      console.log('⚠️ Profil utilisateur non créé (peut déjà exister):', profileError.message);
    } else {
      console.log('✅ Profil utilisateur créé');
    }

    // 6. Trouver le projet "Projet New key"
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .ilike('title', '%new%key%')
      .single();

    if (!project) {
      console.log('⚠️ Projet "New key" non trouvé - IA créée mais non assignée');
      return;
    }

    console.log('📁 Projet trouvé:', project.title);

    // 7. Assigner l'IA au projet
    const { data: assignment, error: assignError } = await supabase
      .from('hr_resource_assignments')
      .insert({
        project_id: project.id,
        profile_id: iaProfileId,
        candidate_id: iaProfileId, // Pour les IA, candidate_id = profile_id
        booking_status: 'accepted', // Auto-accepté pour les IA
        seniority: 'expert',
        languages: ['Français', 'Anglais'],
        expertises: ['Rédaction', 'Marketing']
      })
      .select()
      .single();

    if (assignError) {
      console.error('❌ Erreur assignation au projet:', assignError);
      return;
    }

    console.log('✅ IA assignée au projet avec succès!');
    console.log('\n📊 Résumé:');
    console.log('  - Ressource IA:', hrProfile.name);
    console.log('  - ID:', iaProfileId);
    console.log('  - Email:', 'ia_redacteur@ia.team');
    console.log('  - Projet:', project.title);
    console.log('  - Statut:', assignment.booking_status);
    console.log('\n✨ L\'IA devrait maintenant apparaître dans la messagerie du projet!');

  } catch (error) {
    console.error('❌ Erreur globale:', error);
  }
}

createIAResource();