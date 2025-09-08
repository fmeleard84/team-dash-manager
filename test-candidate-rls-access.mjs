#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://egdelmcijszuapcpglsy.supabase.co";
// Utiliser la clé anon pour le test initial
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log("🔍 Test d'accès RLS pour les candidats aux projets\n");
console.log("=" .repeat(60));

async function testCandidateRLSAccess() {
  try {
    // 1. Trouver un candidat avec des projets acceptés
    console.log("\n1️⃣ Recherche d'un candidat avec des projets acceptés...");
    
    const { data: assignments, error: assignError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        candidate_id,
        project_id,
        booking_status,
        projects!inner(
          id,
          title,
          status
        ),
        candidate_profiles!inner(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('booking_status', 'accepted')
      .limit(5);

    if (assignError) {
      console.error("❌ Erreur lors de la recherche:", assignError);
      return;
    }

    if (!assignments || assignments.length === 0) {
      console.log("⚠️ Aucun candidat avec des projets acceptés trouvé");
      return;
    }

    console.log(`✅ Trouvé ${assignments.length} assignations acceptées\n`);

    // 2. Pour chaque candidat, tester l'accès
    for (const assignment of assignments) {
      const candidateEmail = assignment.candidate_profiles?.email;
      const candidateName = `${assignment.candidate_profiles?.first_name} ${assignment.candidate_profiles?.last_name}`;
      const projectTitle = assignment.projects?.title;
      const projectStatus = assignment.projects?.status;
      
      console.log(`\n📋 Test pour: ${candidateName} (${candidateEmail})`);
      console.log(`   Projet: "${projectTitle}" (status: ${projectStatus})`);
      
      // Simuler l'accès en tant que ce candidat
      const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(
        assignment.candidate_id
      );
      
      if (authError || !user) {
        console.log(`   ⚠️ Impossible de récupérer l'utilisateur: ${authError?.message}`);
        continue;
      }

      // Créer un client avec le token du candidat (simulation)
      const candidateSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            'x-supabase-auth': assignment.candidate_id
          }
        }
      });

      // Test 1: Le candidat peut-il voir le projet?
      console.log("\n   🧪 Test visibilité projet:");
      const { data: visibleProject, error: projectError } = await supabase
        .from('projects')
        .select('id, title, status')
        .eq('id', assignment.project_id)
        .maybeSingle();

      if (visibleProject) {
        console.log(`   ✅ Projet visible: "${visibleProject.title}" (${visibleProject.status})`);
      } else {
        console.log(`   ❌ Projet non visible! Erreur:`, projectError?.message || "Aucune donnée");
      }

      // Test 2: Le candidat peut-il voir ses assignations?
      console.log("\n   🧪 Test visibilité assignations:");
      const { data: visibleAssignments, error: assignmentError } = await supabase
        .from('hr_resource_assignments')
        .select('*')
        .eq('candidate_id', assignment.candidate_id)
        .eq('project_id', assignment.project_id);

      if (visibleAssignments && visibleAssignments.length > 0) {
        console.log(`   ✅ Assignation visible (booking_status: ${visibleAssignments[0].booking_status})`);
      } else {
        console.log(`   ❌ Assignation non visible!`, assignmentError?.message);
      }

      // Test 3: Pour les projets actifs, vérifier l'accès aux outils
      if (projectStatus === 'play') {
        console.log("\n   🧪 Test accès aux outils collaboratifs:");
        
        // Test Kanban
        const { data: kanbanColumns } = await supabase
          .from('kanban_columns')
          .select('id, name')
          .eq('project_id', assignment.project_id)
          .limit(1);
        
        if (kanbanColumns && kanbanColumns.length > 0) {
          console.log(`   ✅ Accès Kanban OK`);
        } else {
          console.log(`   ⚠️ Pas d'accès Kanban ou pas de colonnes`);
        }

        // Test Messages
        const { data: messages } = await supabase
          .from('messages')
          .select('id')
          .eq('project_id', assignment.project_id)
          .limit(1);
        
        if (messages) {
          console.log(`   ✅ Accès Messages OK`);
        } else {
          console.log(`   ⚠️ Pas d'accès Messages ou pas de messages`);
        }

        // Test Events
        const { data: events } = await supabase
          .from('project_events')
          .select('id, title')
          .eq('project_id', assignment.project_id)
          .limit(1);
        
        if (events && events.length > 0) {
          console.log(`   ✅ Accès Planning OK`);
        } else {
          console.log(`   ⚠️ Pas d'accès Planning ou pas d'événements`);
        }
      }
      
      console.log("-".repeat(50));
    }

    // 3. Statistiques globales
    console.log("\n📊 Statistiques globales:");
    
    const { count: totalProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });
    
    const { count: activeProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'play');
    
    const { count: acceptedAssignments } = await supabase
      .from('hr_resource_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('booking_status', 'accepted');
    
    const { count: uniqueCandidates } = await supabase
      .from('hr_resource_assignments')
      .select('candidate_id', { count: 'exact', head: true })
      .eq('booking_status', 'accepted');

    console.log(`
    - Total projets: ${totalProjects}
    - Projets actifs (play): ${activeProjects}
    - Assignations acceptées: ${acceptedAssignments}
    - Candidats avec missions: ~${uniqueCandidates}
    `);

    // 4. Vérifier l'existence de la fonction helper
    console.log("\n🔧 Vérification de la fonction helper:");
    const { data: funcCheck, error: funcError } = await supabase.rpc(
      'check_candidate_project_access',
      {
        p_candidate_id: assignments[0]?.candidate_id,
        p_project_id: assignments[0]?.project_id
      }
    );

    if (funcError) {
      console.log("❌ Fonction check_candidate_project_access non trouvée ou erreur:", funcError.message);
    } else {
      console.log(`✅ Fonction helper disponible. Résultat test: ${funcCheck}`);
    }

    console.log("\n✅ Test terminé!");

  } catch (error) {
    console.error("❌ Erreur générale:", error);
  }
}

// Exécuter le test
testCandidateRLSAccess();