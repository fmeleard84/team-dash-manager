// Test direct avec les données candidat
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCandidateData() {
  console.log('🔍 Test des données candidat pour le diagnostic RLS\n')

  try {
    // 1. Vérifier le candidat
    console.log('👤 1. Vérification du candidat...')
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id, first_name, last_name, user_id, email, status, qualification_status')
      .eq('first_name', 'CDP FM 2708')

    if (candidateError) {
      console.error('❌ Erreur candidat:', candidateError)
    } else {
      console.log('✅ Candidat trouvé:', candidateData)
      
      if (candidateData && candidateData.length > 0) {
        const candidate = candidateData[0]
        console.log(`   📧 Email: ${candidate.email}`)
        console.log(`   🆔 User ID: ${candidate.user_id}`)
        console.log(`   📊 Status: ${candidate.status}`)
        console.log(`   🎓 Qualification: ${candidate.qualification_status}`)
      }
    }

    // 2. Vérifier les assignations
    console.log('\n📂 2. Vérification des assignations...')
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        project_id,
        booking_status,
        candidate_id,
        candidate_profiles!inner (
          user_id,
          first_name,
          email
        )
      `)
      .eq('project_id', 'd7dff6ec-5019-40ab-a00f-8bac8806eca7')

    if (assignmentError) {
      console.error('❌ Erreur assignation:', assignmentError)
    } else {
      console.log('✅ Assignations trouvées:', assignmentData?.length || 0)
      
      if (assignmentData && assignmentData.length > 0) {
        assignmentData.forEach((assignment, i) => {
          console.log(`   ${i+1}. Candidat: ${assignment.candidate_profiles?.first_name}`)
          console.log(`      📋 Booking Status: ${assignment.booking_status}`)
          console.log(`      🆔 Candidate User ID: ${assignment.candidate_profiles?.user_id}`)
        })
      }
    }

    // 3. Vérifier le projet
    console.log('\n🏗️ 3. Vérification du projet...')
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, name, title, owner_id, status')
      .eq('id', 'd7dff6ec-5019-40ab-a00f-8bac8806eca7')

    if (projectError) {
      console.error('❌ Erreur projet:', projectError)
    } else {
      console.log('✅ Projet trouvé:', projectData)
      
      if (projectData && projectData.length > 0) {
        const project = projectData[0]
        console.log(`   📛 Nom: ${project.name}`)
        console.log(`   📄 Titre: ${project.title}`)
        console.log(`   👤 Owner ID: ${project.owner_id}`)
        console.log(`   📊 Status: ${project.status}`)
      }
    }

    // 4. Analyse RLS
    console.log('\n🔍 4. Analyse RLS...')
    
    if (candidateData?.[0] && assignmentData?.[0]) {
      const candidate = candidateData[0]
      const assignment = assignmentData.find(a => a.candidate_profiles?.first_name === 'CDP FM 2708')
      
      const simulatedPath = 'projects/d7dff6ec-5019-40ab-a00f-8bac8806eca7/Facture_042341_NEXT PROJECT.pdf'
      const extractedProjectId = simulatedPath.split('/')[1]
      
      console.log(`   🛤️ Chemin simulé: ${simulatedPath}`)
      console.log(`   🆔 Projet extrait: ${extractedProjectId}`)
      console.log(`   🆔 Projet assignation: ${assignment?.project_id}`)
      console.log(`   ✅ Match projet: ${assignment?.project_id === extractedProjectId}`)
      console.log(`   📋 Booking status: ${assignment?.booking_status}`)
      console.log(`   ✅ Booking OK: ${assignment?.booking_status === 'accepted'}`)
      console.log(`   🆔 Candidat User ID: ${candidate.user_id}`)
      
      const shouldWork = (
        assignment?.project_id === extractedProjectId &&
        assignment?.booking_status === 'accepted' &&
        candidate.user_id
      )
      
      console.log(`   🎯 RLS devrait fonctionner: ${shouldWork ? '✅ OUI' : '❌ NON'}`)
      
      if (!shouldWork) {
        console.log('\n❌ PROBLÈMES IDENTIFIÉS:')
        if (assignment?.project_id !== extractedProjectId) {
          console.log('   - Projet ID ne correspond pas')
        }
        if (assignment?.booking_status !== 'accepted') {
          console.log(`   - Booking status "${assignment?.booking_status}" != "accepted"`)
        }
        if (!candidate.user_id) {
          console.log('   - User ID candidat manquant')
        }
      }
    } else {
      console.log('❌ Impossible d\'analyser - données manquantes')
    }

    // 5. Test des politiques actuelles
    console.log('\n🔐 5. Test d\'accès storage...')
    
    try {
      // Tenter de lister les objets du projet (doit être autorisé)
      const { data: storageData, error: storageError } = await supabase.storage
        .from('project-files')
        .list('projects/d7dff6ec-5019-40ab-a00f-8bac8806eca7', { limit: 10 })
      
      if (storageError) {
        console.log('❌ Erreur accès storage:', storageError.message)
      } else {
        console.log('✅ Accès storage OK, fichiers trouvés:', storageData?.length || 0)
      }
    } catch (err) {
      console.log('❌ Exception storage:', err.message)
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

testCandidateData()