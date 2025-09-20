import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
)

console.log('🔍 RECHERCHE DE TOUS LES PROJETS AVEC DES IA')
console.log('=============================================')

try {
  // 1. Lister TOUS les projets
  const { data: allProjects, error: projectsError } = await supabase
    .from('projects')
    .select('id, title, status')
    .order('created_at', { ascending: false })

  if (projectsError) {
    console.error('❌ Erreur récupération projets:', projectsError)
    process.exit(1)
  }

  console.log(`\n📋 TOUS LES PROJETS (${allProjects.length}):`)
  allProjects.forEach((project, index) => {
    console.log(`${index + 1}. ${project.title} (${project.status}) - ID: ${project.id}`)
  })

  // 2. Chercher les projets avec "IA" ou "ia" dans le titre
  const iaProjects = allProjects.filter(p =>
    p.title.toLowerCase().includes('ia') ||
    p.title.toLowerCase().includes('ai') ||
    p.title.toLowerCase().includes('book')
  )

  console.log(`\n🤖 PROJETS CONTENANT "IA", "AI" ou "BOOK" (${iaProjects.length}):`)
  iaProjects.forEach(project => {
    console.log(`   - ${project.title} (${project.status}) - ID: ${project.id}`)
  })

  // 3. Pour chaque projet potentiel, analyser les assignations
  for (const project of iaProjects) {
    console.log(`\n🔍 ANALYSE DU PROJET: ${project.title}`)
    console.log('=' + '='.repeat(project.title.length + 20))

    const { data: assignments, error: assignmentError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        booking_status,
        candidate_id,
        profile_id,
        hr_profiles!inner (
          id,
          name,
          is_ai,
          prompt_id
        )
      `)
      .eq('project_id', project.id)

    if (assignmentError) {
      console.log(`❌ Erreur assignations: ${assignmentError.message}`)
      continue
    }

    if (!assignments || assignments.length === 0) {
      console.log(`📭 Aucune assignation pour ce projet`)
      continue
    }

    console.log(`\n👥 MEMBRES ASSIGNÉS (${assignments.length}):`)
    assignments.forEach(assignment => {
      const profile = assignment.hr_profiles
      const type = profile.is_ai ? '🤖 IA' : '👤 HUMAIN'

      console.log(`   ${type} ${profile.name}`)
      console.log(`      ┣━ Assignment ID: ${assignment.id}`)
      console.log(`      ┣━ Profile ID: ${assignment.profile_id}`)
      console.log(`      ┣━ Candidate ID: ${assignment.candidate_id || 'NULL'}`)
      console.log(`      ┣━ Booking Status: ${assignment.booking_status}`)
      console.log(`      ┗━ Prompt ID: ${profile.prompt_id || 'NULL'}`)
    })

    // Vérifier si les IA ont des profils candidats
    const aiAssignments = assignments.filter(a => a.hr_profiles.is_ai)
    if (aiAssignments.length > 0) {
      console.log(`\n🤖 VÉRIFICATION PROFILS CANDIDATS IA:`)
      for (const aiAssignment of aiAssignments) {
        if (aiAssignment.candidate_id) {
          const { data: candidateProfile, error: candidateError } = await supabase
            .from('candidate_profiles')
            .select('first_name, last_name, email, status')
            .eq('id', aiAssignment.candidate_id)
            .single()

          if (!candidateError && candidateProfile) {
            console.log(`   ✅ ${aiAssignment.hr_profiles.name}: ${candidateProfile.first_name} ${candidateProfile.last_name} (${candidateProfile.email})`)
          } else {
            console.log(`   ❌ ${aiAssignment.hr_profiles.name}: Profil candidat introuvable`)
          }
        } else {
          console.log(`   ⚠️ ${aiAssignment.hr_profiles.name}: Pas de candidate_id`)
        }
      }
    }
  }

  // 4. Analyser spécifiquement le hook useProjectMembersForMessaging
  console.log(`\n📡 SIMULATION useProjectMembersForMessaging POUR CHAQUE PROJET:`)
  console.log('================================================================')

  for (const project of iaProjects) {
    console.log(`\n🎯 ${project.title}:`)

    const { data: members, error: membersError } = await supabase
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
          email
        )
      `)
      .eq('project_id', project.id)
      .eq('booking_status', 'accepted')

    if (membersError) {
      console.log(`   ❌ Erreur: ${membersError.message}`)
      continue
    }

    if (!members || members.length === 0) {
      console.log(`   📭 Aucun membre avec booking_status='accepted'`)
      continue
    }

    console.log(`   ✅ ${members.length} membre(s) accepté(s):`)
    members.forEach(member => {
      const candidateName = member.candidate_profiles
        ? `${member.candidate_profiles.first_name} ${member.candidate_profiles.last_name}`
        : 'PROFIL MANQUANT'

      console.log(`      ${member.hr_profiles.is_ai ? '🤖' : '👤'} ${member.hr_profiles.name} → ${candidateName}`)
    })
  }

} catch (error) {
  console.error('❌ Erreur générale:', error)
  process.exit(1)
}