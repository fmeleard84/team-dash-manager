import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
)

console.log('🔍 ANALYSE DÉTAILLÉE DU PROJET "IA BOOK"')
console.log('============================================')

try {
  // 1. Trouver le projet "IA book"
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, title, status')
    .or('title.ilike.%IA book%, title.ilike.%ia book%')

  if (projectError || !projects || projects.length === 0) {
    console.log('❌ Projet "IA book" non trouvé')
    process.exit(1)
  }

  const project = projects[0]
  console.log(`\n📋 PROJET TROUVÉ:`)
  console.log(`   Titre: ${project.title}`)
  console.log(`   ID: ${project.id}`)
  console.log(`   Status: ${project.status}`)

  // 2. Récupérer TOUS les candidats visibles dans le détail du projet
  console.log(`\n👥 CANDIDATS ASSIGNÉS AU PROJET:`)
  console.log('=================================')

  const { data: assignments, error: assignmentError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      id,
      booking_status,
      candidate_id,
      profile_id,
      seniority,
      languages,
      expertises,
      hr_profiles!inner (
        id,
        name,
        is_ai,
        prompt_id,
        base_price,
        category_id
      )
    `)
    .eq('project_id', project.id)

  if (assignmentError) {
    console.error('❌ Erreur récupération assignations:', assignmentError)
    process.exit(1)
  }

  if (!assignments || assignments.length === 0) {
    console.log('❌ Aucune assignation trouvée pour ce projet')
    process.exit(1)
  }

  console.log(`\n📊 TROUVÉ ${assignments.length} ASSIGNATION(S):`)

  for (let i = 0; i < assignments.length; i++) {
    const assignment = assignments[i]
    const profile = assignment.hr_profiles

    console.log(`\n${i + 1}. ${profile.name}`)
    console.log(`   ┣━ Assignment ID: ${assignment.id}`)
    console.log(`   ┣━ Profile ID: ${assignment.profile_id}`)
    console.log(`   ┣━ Candidate ID: ${assignment.candidate_id || 'NULL'}`)
    console.log(`   ┣━ Booking Status: ${assignment.booking_status}`)
    console.log(`   ┣━ IS_AI: ${profile.is_ai}`)
    console.log(`   ┣━ Prompt ID: ${profile.prompt_id || 'NULL'}`)
    console.log(`   ┣━ Seniority: ${assignment.seniority}`)
    console.log(`   ┣━ Languages: ${JSON.stringify(assignment.languages)}`)
    console.log(`   ┗━ Expertises: ${JSON.stringify(assignment.expertises)}`)

    // 3. Pour chaque assignation, vérifier le profil candidat correspondant
    if (assignment.candidate_id) {
      const { data: candidateProfile, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', assignment.candidate_id)
        .single()

      if (!candidateError && candidateProfile) {
        console.log(`   📋 PROFIL CANDIDAT ASSOCIÉ:`)
        console.log(`      ┣━ First Name: ${candidateProfile.first_name}`)
        console.log(`      ┣━ Last Name: ${candidateProfile.last_name}`)
        console.log(`      ┣━ Email: ${candidateProfile.email}`)
        console.log(`      ┣━ Status: ${candidateProfile.status}`)
        console.log(`      ┗━ Daily Rate: ${candidateProfile.daily_rate}`)
      } else {
        console.log(`   ⚠️ PROFIL CANDIDAT NON TROUVÉ (ID: ${assignment.candidate_id})`)
      }
    } else {
      console.log(`   ⚠️ AUCUN CANDIDATE_ID ASSIGNÉ`)
    }
  }

  // 4. Analyser les différences entre IA et humains
  console.log(`\n🔍 ANALYSE DES DIFFÉRENCES:`)
  console.log('============================')

  const aiAssignments = assignments.filter(a => a.hr_profiles.is_ai === true)
  const humanAssignments = assignments.filter(a => a.hr_profiles.is_ai === false)

  console.log(`\n🤖 RESSOURCES IA (${aiAssignments.length}):`)
  aiAssignments.forEach(ai => {
    console.log(`   - ${ai.hr_profiles.name}`)
    console.log(`     Profile ID: ${ai.profile_id}`)
    console.log(`     Candidate ID: ${ai.candidate_id || 'MANQUANT'}`)
    console.log(`     Booking: ${ai.booking_status}`)
    console.log(`     Prompt: ${ai.hr_profiles.prompt_id || 'MANQUANT'}`)
  })

  console.log(`\n👥 RESSOURCES HUMAINES (${humanAssignments.length}):`)
  humanAssignments.forEach(human => {
    console.log(`   - ${human.hr_profiles.name}`)
    console.log(`     Profile ID: ${human.profile_id}`)
    console.log(`     Candidate ID: ${human.candidate_id || 'MANQUANT'}`)
    console.log(`     Booking: ${human.booking_status}`)
  })

  // 5. Vérifier ce qui est récupéré par le hook useProjectMembersForMessaging
  console.log(`\n📡 SIMULATION HOOK useProjectMembersForMessaging:`)
  console.log('=================================================')

  // Simuler la requête du hook
  const { data: membersData, error: membersError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      profile_id,
      candidate_id,
      booking_status,
      hr_profiles!inner (
        id,
        name,
        is_ai,
        prompt_id
      ),
      candidate_profiles (
        id,
        first_name,
        last_name,
        email,
        status
      )
    `)
    .eq('project_id', project.id)
    .eq('booking_status', 'accepted')

  console.log(`\nRÉSULTAT REQUÊTE HOOK (booking_status = 'accepted'):`)
  if (membersError) {
    console.log(`❌ Erreur: ${membersError.message}`)
  } else if (!membersData || membersData.length === 0) {
    console.log(`❌ Aucun membre avec booking_status = 'accepted'`)
  } else {
    console.log(`✅ ${membersData.length} membre(s) trouvé(s):`)
    membersData.forEach(member => {
      console.log(`   - ${member.hr_profiles.name} (${member.hr_profiles.is_ai ? 'IA' : 'Humain'})`)
      console.log(`     Candidate Profile: ${member.candidate_profiles ? 'EXISTE' : 'MANQUANT'}`)
    })
  }

  // 6. Recommandations
  console.log(`\n💡 RECOMMANDATIONS:`)
  console.log('===================')

  if (aiAssignments.length > 0) {
    const aiWithoutCandidate = aiAssignments.filter(ai => !ai.candidate_id)
    const aiNotAccepted = aiAssignments.filter(ai => ai.booking_status !== 'accepted')

    if (aiWithoutCandidate.length > 0) {
      console.log(`⚠️ ${aiWithoutCandidate.length} IA(s) sans candidate_id - Créer les profils candidats`)
    }
    if (aiNotAccepted.length > 0) {
      console.log(`⚠️ ${aiNotAccepted.length} IA(s) avec booking_status != 'accepted' - Mettre à jour le statut`)
    }
    if (aiWithoutCandidate.length === 0 && aiNotAccepted.length === 0) {
      console.log(`✅ Configuration IA correcte - Devrait apparaître dans la messagerie`)
    }
  } else {
    console.log(`❌ Aucune IA trouvée dans ce projet`)
  }

} catch (error) {
  console.error('❌ Erreur lors de l\'analyse:', error)
  process.exit(1)
}