#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function analyzeIAVisibility() {
  console.log('🔍 Analyse du problème de visibilité IA côté candidat\n');
  console.log('='.repeat(60));

  try {
    // 1. Rechercher des projets avec IA (comme dans CLAUDE.md)
    console.log('\n1️⃣ Recherche de projets avec IA (méthode officielle)...');

    const { data: assignments, error } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        projects!inner (
          id,
          title,
          status
        ),
        hr_profiles!inner (
          id,
          name,
          is_ai
        ),
        candidate_profiles (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('hr_profiles.is_ai', true);

    if (error) {
      console.error('❌ Erreur:', error);
      return;
    }

    console.log(`✅ ${assignments?.length || 0} assignments IA trouvés`);

    if (assignments && assignments.length > 0) {
      console.log('\n📊 Détails des projets avec IA:');

      // Grouper par projet
      const projectsMap = new Map();

      for (const assign of assignments) {
        const projectId = assign.projects.id;

        if (!projectsMap.has(projectId)) {
          projectsMap.set(projectId, {
            ...assign.projects,
            iaResources: [],
            humanResources: []
          });
        }

        projectsMap.get(projectId).iaResources.push({
          name: assign.hr_profiles.name,
          profileId: assign.profile_id,
          candidateId: assign.candidate_id,
          bookingStatus: assign.booking_status
        });
      }

      // Afficher les projets
      for (const [projectId, project] of projectsMap) {
        console.log(`\n📁 Projet: ${project.title}`);
        console.log(`   ID: ${projectId}`);
        console.log(`   Status: ${project.status}`);
        console.log(`   🤖 IA Resources: ${project.iaResources.length}`);

        for (const ia of project.iaResources) {
          console.log(`      - ${ia.name}`);
          console.log(`        Profile ID: ${ia.profileId}`);
          console.log(`        Candidate ID: ${ia.candidateId || 'NON DÉFINI ⚠️'}`);
          console.log(`        Booking: ${ia.bookingStatus}`);
        }

        // Vérifier aussi les ressources humaines du même projet
        const { data: humanAssignments } = await supabase
          .from('hr_resource_assignments')
          .select(`
            *,
            hr_profiles!inner (
              name,
              is_ai
            ),
            candidate_profiles (
              first_name,
              last_name
            )
          `)
          .eq('project_id', projectId)
          .eq('hr_profiles.is_ai', false);

        if (humanAssignments && humanAssignments.length > 0) {
          console.log(`   👤 Human Resources: ${humanAssignments.length}`);
          for (const human of humanAssignments) {
            const name = human.candidate_profiles?.first_name || 'Sans nom';
            console.log(`      - ${name} (${human.hr_profiles.name})`);
          }
        }
      }

      // 2. Analyser le hook useProjectMembersForMessaging
      console.log('\n\n2️⃣ Analyse du filtre dans useProjectMembersForMessaging...');

      // Simuler ce que fait le hook
      const firstProjectId = Array.from(projectsMap.keys())[0];
      console.log(`\n🔄 Simulation pour projet: ${projectsMap.get(firstProjectId).title}`);

      // Récupérer tous les assignments
      const { data: allAssignments } = await supabase
        .from('hr_resource_assignments')
        .select(`
          *,
          hr_profiles (
            name,
            is_ai,
            prompt_id
          )
        `)
        .eq('project_id', firstProjectId)
        .in('booking_status', ['accepted', 'completed']);

      console.log(`\n📋 Assignments trouvés: ${allAssignments?.length || 0}`);

      if (allAssignments) {
        const iaAssignments = allAssignments.filter(a => a.hr_profiles?.is_ai);
        const humanAssignments = allAssignments.filter(a => !a.hr_profiles?.is_ai);

        console.log(`   🤖 IA: ${iaAssignments.length}`);
        console.log(`   👤 Humains: ${humanAssignments.length}`);

        // Vérifier la condition critique dans le hook
        console.log('\n⚠️ Points de filtrage critiques dans le hook:');

        for (const assign of iaAssignments) {
          console.log(`\n   IA: ${assign.hr_profiles.name}`);
          console.log(`   - is_ai: ${assign.hr_profiles.is_ai}`);
          console.log(`   - candidate_id: ${assign.candidate_id || 'NULL ⚠️'}`);
          console.log(`   - profile_id: ${assign.profile_id}`);

          // Le hook vérifie : if (isAI) { ... } else if (assignment.candidate_id) { ... }
          if (assign.hr_profiles.is_ai) {
            console.log(`   ✅ Devrait être ajouté comme IA (id: ia_${assign.profile_id})`);
          } else if (assign.candidate_id) {
            console.log(`   ❌ Serait traité comme humain (bug potentiel)`);
          } else {
            console.log(`   ⚠️ Tomberait dans le fallback`);
          }
        }
      }

      // 3. Vérifier les conditions de filtre final
      console.log('\n\n3️⃣ Analyse du filtre final (ligne 282-295 du hook)...');
      console.log('Le hook filtre avec:');
      console.log('- Les IA doivent TOUJOURS être visibles (m.isAI = true)');
      console.log('- Les humains sont filtrés si m.id === user.id');

      // Simuler un user candidat
      console.log('\n🧪 Test avec différents utilisateurs:');

      // Récupérer un candidat du projet
      const { data: candidateExample } = await supabase
        .from('hr_resource_assignments')
        .select('candidate_id')
        .eq('project_id', firstProjectId)
        .not('candidate_id', 'is', null)
        .limit(1)
        .single();

      if (candidateExample?.candidate_id) {
        console.log(`\nPour un candidat (ID: ${candidateExample.candidate_id}):`);
        console.log('- Les IA devraient apparaître ✅');
        console.log('- Le candidat lui-même serait filtré ✅');
        console.log('- Les autres candidats apparaîtraient ✅');
      }

    } else {
      console.log('⚠️ Aucun projet avec IA trouvé');

      // Vérifier s'il y a des projets tout court
      const { data: anyProject } = await supabase
        .from('projects')
        .select('id, title, status')
        .limit(1)
        .single();

      if (anyProject) {
        console.log(`\n📁 Projet exemple trouvé: ${anyProject.title}`);
        console.log('   Création d\'une IA pour test...');

        // Suggérer la création
        console.log('\n💡 Pour tester, il faut:');
        console.log('1. Créer un projet');
        console.log('2. Ajouter une ressource IA dans hr_resource_assignments');
        console.log('3. S\'assurer que booking_status = "accepted"');
      } else {
        console.log('❌ Aucun projet dans la base');
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

analyzeIAVisibility();