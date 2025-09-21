import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function checkIAResources() {
  console.log('🔍 Recherche détaillée des ressources IA dans hr_profiles...\n');

  try {
    // 1. D'abord, chercher TOUTES les ressources avec "IA" dans le nom
    const { data: allIAProfiles, error: iaError } = await supabase
      .from('hr_profiles')
      .select(`
        *,
        hr_categories (
          name
        )
      `)
      .ilike('name', '%IA%');

    if (iaError) {
      console.error('❌ Erreur recherche IA:', iaError);
      return;
    }

    console.log(`📊 Ressources avec "IA" dans le nom: ${allIAProfiles?.length || 0}`);
    
    if (allIAProfiles && allIAProfiles.length > 0) {
      console.log('\n📋 Liste des ressources IA trouvées:');
      for (const profile of allIAProfiles) {
        console.log(`\n🤖 ${profile.name}`);
        console.log(`   - ID: ${profile.id}`);
        console.log(`   - Catégorie: ${profile.hr_categories?.name || 'Non définie'}`);
        console.log(`   - is_ai: ${profile.is_ai || false}`);
        console.log(`   - Prix de base: ${profile.base_price || 'Non défini'}`);
        
        // Vérifier si cette ressource a un profil candidat
        const { data: candidateProfile } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('id', profile.id)
          .single();
        
        if (candidateProfile) {
          console.log(`   ✅ Profil candidat EXISTE:`);
          console.log(`      - Nom: ${candidateProfile.first_name} ${candidateProfile.last_name}`);
          console.log(`      - Email: ${candidateProfile.email}`);
          console.log(`      - Status: ${candidateProfile.status}`);
        } else {
          console.log(`   ❌ Profil candidat MANQUANT`);
        }

        // Vérifier si cette ressource a un profil utilisateur
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profile.id)
          .single();
        
        if (userProfile) {
          console.log(`   ✅ Profil utilisateur EXISTE`);
        } else {
          console.log(`   ❌ Profil utilisateur MANQUANT`);
        }
      }
    }

    // 2. Chercher spécifiquement dans la catégorie Content
    console.log('\n\n🔍 Recherche dans la catégorie Content...');
    
    const { data: contentCategory } = await supabase
      .from('hr_categories')
      .select('*')
      .ilike('name', '%content%')
      .single();
    
    if (contentCategory) {
      console.log(`✅ Catégorie Content trouvée: ${contentCategory.name} (ID: ${contentCategory.id})`);

      const { data: contentProfiles } = await supabase
        .from('hr_profiles')
        .select('*')
        .eq('category_id', contentCategory.id);

      console.log(`📊 Ressources dans Content: ${contentProfiles?.length || 0}`);
      
      if (contentProfiles) {
        for (const profile of contentProfiles) {
          if (profile.name.includes('IA')) {
            console.log(`   - ${profile.name} (is_ai: ${profile.is_ai || false})`);
          }
        }
      }
    }

    // 3. Vérifier les assignations de ces ressources IA
    console.log('\n\n🔍 Vérification des assignations de ressources IA...');
    
    if (allIAProfiles && allIAProfiles.length > 0) {
      for (const profile of allIAProfiles) {
        const { data: assignments } = await supabase
          .from('hr_resource_assignments')
          .select(`
            *,
            projects (
              title,
              status
            )
          `)
          .eq('profile_id', profile.id);
        
        if (assignments && assignments.length > 0) {
          console.log(`\n📋 Assignations pour ${profile.name}:`);
          for (const assignment of assignments) {
            console.log(`   - Projet: ${assignment.projects?.title}`);
            console.log(`     • booking_status: ${assignment.booking_status}`);
            console.log(`     • candidate_id: ${assignment.candidate_id || 'NULL'}`);
            console.log(`     • Statut projet: ${assignment.projects?.status}`);
          }
        }
      }
    }

    // 4. Vérifier spécifiquement le projet "Projet new key"
    console.log('\n\n🔍 Recherche du projet "Projet new key"...');
    
    const { data: newKeyProjects } = await supabase
      .from('projects')
      .select('*')
      .ilike('title', '%new%key%');
    
    if (newKeyProjects && newKeyProjects.length > 0) {
      const project = newKeyProjects[0];
      console.log(`✅ Projet trouvé: ${project.title} (ID: ${project.id})`);
      
      // Voir toutes les ressources assignées
      const { data: projectAssignments } = await supabase
        .from('hr_resource_assignments')
        .select(`
          *,
          hr_profiles (
            name,
            is_ai
          )
        `)
        .eq('project_id', project.id);
      
      console.log(`\n📊 Ressources assignées au projet:`);
      if (projectAssignments) {
        for (const assignment of projectAssignments) {
          const isIA = assignment.hr_profiles?.name?.includes('IA');
          console.log(`   ${isIA ? '🤖' : '👤'} ${assignment.hr_profiles?.name}`);
          console.log(`      - profile_id: ${assignment.profile_id}`);
          console.log(`      - candidate_id: ${assignment.candidate_id || 'NULL'}`);
          console.log(`      - booking_status: ${assignment.booking_status}`);
          console.log(`      - is_ai dans hr_profiles: ${assignment.hr_profiles?.is_ai || false}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkIAResources();
