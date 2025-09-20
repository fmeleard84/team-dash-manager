import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
)

console.log('🔍 Vérification de la configuration existante "Concepteur rédacteur IA"...')

try {
  // 1. Chercher le profil "Concepteur rédacteur IA"
  const { data: aiProfiles, error: profileError } = await supabase
    .from('hr_profiles')
    .select('*')
    .eq('name', 'Concepteur rédacteur IA')
    .eq('is_ai', true)

  if (profileError) {
    console.error('❌ Erreur recherche profil:', profileError)
    process.exit(1)
  }

  if (!aiProfiles || aiProfiles.length === 0) {
    console.log('❌ Aucun profil "Concepteur rédacteur IA" trouvé')
    process.exit(1)
  }

  const aiProfile = aiProfiles[0]
  console.log('✅ Profil IA trouvé:', {
    id: aiProfile.id,
    name: aiProfile.name,
    is_ai: aiProfile.is_ai,
    prompt_id: aiProfile.prompt_id
  })

  // 2. Chercher les assignations de ce profil
  const { data: assignments, error: assignmentError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      id,
      project_id,
      booking_status,
      candidate_id,
      projects (
        id,
        title,
        status
      )
    `)
    .eq('profile_id', aiProfile.id)

  if (assignmentError) {
    console.error('❌ Erreur recherche assignations:', assignmentError)
    process.exit(1)
  }

  console.log('\n📋 ASSIGNATIONS TROUVÉES:')
  assignments?.forEach((assignment, index) => {
    console.log(`${index + 1}. Projet: ${assignment.projects?.title}`)
    console.log(`   - ID: ${assignment.projects?.id}`)
    console.log(`   - Status projet: ${assignment.projects?.status}`)
    console.log(`   - Status booking: ${assignment.booking_status}`)
    console.log(`   - Candidate ID: ${assignment.candidate_id || 'Non assigné'}`)
  })

  // 3. Vérifier le profil candidat associé si il existe
  if (assignments && assignments.length > 0) {
    const candidateIds = assignments
      .filter(a => a.candidate_id)
      .map(a => a.candidate_id)

    if (candidateIds.length > 0) {
      const { data: candidateProfiles, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select('id, first_name, last_name, email, status')
        .in('id', candidateIds)

      console.log('\n👤 PROFILS CANDIDATS ASSOCIÉS:')
      candidateProfiles?.forEach(candidate => {
        console.log(`   - ${candidate.first_name} ${candidate.last_name}`)
        console.log(`   - Email: ${candidate.email}`)
        console.log(`   - Status: ${candidate.status}`)
        console.log(`   - ID: ${candidate.id}`)
      })
    }
  }

  // 4. Focus sur le projet "IA book" spécifiquement
  const iaBookAssignment = assignments?.find(a =>
    a.projects?.title?.toLowerCase().includes('ia book') ||
    a.projects?.title?.toLowerCase().includes('ia book')
  )

  if (iaBookAssignment) {
    console.log('\n🎯 PROJET "IA BOOK" TROUVÉ:')
    console.log(`   - Titre: ${iaBookAssignment.projects.title}`)
    console.log(`   - ID: ${iaBookAssignment.projects.id}`)
    console.log(`   - Status projet: ${iaBookAssignment.projects.status}`)
    console.log(`   - IA assignée: ${aiProfile.name}`)
    console.log(`   - Status booking: ${iaBookAssignment.booking_status}`)
    console.log(`   - Candidate ID: ${iaBookAssignment.candidate_id || 'Non assigné'}`)

    // Si pas de candidate_id, c'est là le problème
    if (!iaBookAssignment.candidate_id) {
      console.log('\n⚠️ PROBLÈME IDENTIFIÉ:')
      console.log('   L\'IA est assignée au projet mais n\'a pas de candidate_id')
      console.log('   Cela empêche son apparition dans la messagerie')
    } else {
      console.log('\n✅ CONFIGURATION CORRECTE:')
      console.log('   L\'IA a bien un candidate_id, elle devrait apparaître dans la messagerie')
    }
  } else {
    console.log('\n❌ Aucune assignation trouvée pour le projet "IA book"')
  }

} catch (error) {
  console.error('❌ Erreur lors de la vérification:', error)
  process.exit(1)
}