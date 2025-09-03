// Test direct diagnosis function
const testDirectDiagnosis = async () => {
  try {
    console.log('🔍 Lancement du diagnostic direct...\n');

    const response = await fetch('https://egdelmcijszuapcpglsy.supabase.co/functions/v1/diagnose-storage-direct', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQzMjg2MTcsImV4cCI6MjAzOTkwNDYxN30.Z8xt6O-jE8F6Y0Xc7yNdLzIhIQh0w3F6X4ZLe8R6k5g',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQzMjg2MTcsImV4cCI6MjAzOTkwNDYxN30.Z8xt6O-jE8F6Y0Xc7yNdLzIhIQh0w3F6X4ZLe8R6k5g',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erreur HTTP:', response.status, result);
      return;
    }

    console.log('📊 RÉSULTATS DU DIAGNOSTIC');
    console.log('==========================\n');

    if (result.success) {
      const { analysis, summary } = result;

      console.log('👤 CANDIDAT:');
      if (analysis.candidateData && analysis.candidateData.length > 0) {
        const candidate = analysis.candidateData[0];
        console.log(`   ✅ Trouvé: ${candidate.first_name} ${candidate.last_name}`);
        console.log(`   📧 Email: ${candidate.email}`);
        console.log(`   🆔 User ID: ${candidate.user_id}`);
      } else {
        console.log('   ❌ Candidat non trouvé');
      }

      console.log('\n📂 ASSIGNATIONS:');
      if (analysis.assignmentData && analysis.assignmentData.length > 0) {
        analysis.assignmentData.forEach((assignment, i) => {
          console.log(`   ${i+1}. Candidat: ${assignment.candidate_profiles?.first_name || 'N/A'}`);
          console.log(`      📋 Status: ${assignment.booking_status}`);
          console.log(`      🆔 Candidate User ID: ${assignment.candidate_profiles?.user_id || 'N/A'}`);
          console.log(`      ✅ Status OK pour RLS: ${assignment.booking_status === 'accepted' ? 'OUI' : 'NON'}`);
        });
      } else {
        console.log('   ❌ Aucune assignation trouvée');
      }

      console.log('\n👔 PROJET:');
      if (analysis.projectData && analysis.projectData.length > 0) {
        const project = analysis.projectData[0];
        console.log(`   ✅ Trouvé: ${project.name}`);
        console.log(`   🆔 Owner ID: ${project.owner_id}`);
        console.log(`   📊 Status: ${project.status}`);
      } else {
        console.log('   ❌ Projet non trouvé');
      }

      console.log('\n🔐 POLITIQUES RLS:');
      if (analysis.policyData) {
        console.log('   ✅ Politiques récupérées via RPC');
        if (Array.isArray(analysis.policyData)) {
          analysis.policyData.forEach((policy, i) => {
            console.log(`   ${i+1}. ${policy.policyname} (${policy.cmd})`);
          });
        }
      } else if (analysis.policyError) {
        console.log(`   ⚠️ Erreur RPC: ${analysis.policyError}`);
      } else {
        console.log('   ❌ Pas de données de politique');
      }

      console.log('\n🎯 RÉSUMÉ:');
      console.log(`   Candidat trouvé: ${summary.candidateFound ? '✅' : '❌'}`);
      console.log(`   Assignation trouvée: ${summary.assignmentFound ? '✅' : '❌'}`);
      console.log(`   Projet trouvé: ${summary.projectFound ? '✅' : '❌'}`);
      console.log(`   Booking Status: ${summary.bookingStatus || 'N/A'}`);
      console.log(`   Status correct: ${summary.bookingStatusCorrect ? '✅' : '❌'}`);
      console.log(`   User ID candidat: ${summary.candidateUserId || 'N/A'}`);

      // Analyse des problèmes potentiels
      console.log('\n🔍 ANALYSE DES PROBLÈMES:');
      if (!summary.candidateFound) {
        console.log('   ❌ PROBLÈME: Candidat "CDP FM 2708" introuvable');
      }
      if (!summary.assignmentFound) {
        console.log('   ❌ PROBLÈME: Aucune assignation pour le projet');
      }
      if (!summary.bookingStatusCorrect && summary.bookingStatus) {
        console.log(`   ❌ PROBLÈME: Booking status "${summary.bookingStatus}" != "accepted"`);
      }
      if (!summary.candidateUserId) {
        console.log('   ❌ PROBLÈME: User ID candidat manquant');
      }

      // Recommandations
      if (summary.candidateFound && summary.assignmentFound && summary.bookingStatusCorrect) {
        console.log('\n✅ DIAGNOSTIC: Les données semblent correctes côté base');
        console.log('   🔍 Le problème pourrait être:');
        console.log('   - Les politiques RLS ne sont pas appliquées correctement');
        console.log('   - L\'auth.uid() du candidat ne correspond pas au user_id');
        console.log('   - Un problème dans la structure du chemin de fichier');
      }

    } else {
      console.log('❌ Diagnostic échoué:', result.error);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
};

testDirectDiagnosis();