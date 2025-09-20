import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
)

console.log('🔍 ANALYSE COMPLÈTE DU PROJET IA BOOK')
console.log('====================================')

try {
  // 1. Vérifier tous les projets sans filtre
  console.log('\n📋 ÉTAPE 1 : TOUS LES PROJETS')
  const { data: allProjects, error: projectsError } = await supabase
    .from('projects')
    .select('*')

  if (projectsError) {
    console.error('❌ Erreur projets:', projectsError)
  } else {
    console.log(`✅ Trouvé ${allProjects?.length || 0} projet(s)`)
    if (allProjects && allProjects.length > 0) {
      allProjects.forEach((project, index) => {
        console.log(`   ${index + 1}. ${project.title} (${project.status}) - ID: ${project.id}`)
        if (project.title.toLowerCase().includes('ia') || project.title.toLowerCase().includes('book')) {
          console.log(`      🎯 MATCH IA/BOOK !`)
        }
      })
    }
  }

  // 2. Vérifier tous les hr_profiles IA
  console.log('\n🤖 ÉTAPE 2 : PROFILS HR IA')
  const { data: aiProfiles, error: aiError } = await supabase
    .from('hr_profiles')
    .select('*')
    .eq('is_ai', true)

  if (aiError) {
    console.error('❌ Erreur profils IA:', aiError)
  } else {
    console.log(`✅ Trouvé ${aiProfiles?.length || 0} profil(s) IA`)
    aiProfiles?.forEach(profile => {
      console.log(`   - ${profile.name} (ID: ${profile.id})`)
      console.log(`     Prompt: ${profile.prompt_id || 'Non configuré'}`)
      console.log(`     Prix base: ${profile.base_price}`)
    })
  }

  // 3. Vérifier toutes les assignations
  console.log('\n📋 ÉTAPE 3 : TOUTES LES ASSIGNATIONS')
  const { data: allAssignments, error: assignError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      hr_profiles (
        id,
        name,
        is_ai,
        prompt_id
      ),
      projects (
        id,
        title,
        status
      )
    `)

  if (assignError) {
    console.error('❌ Erreur assignations:', assignError)
  } else {
    console.log(`✅ Trouvé ${allAssignments?.length || 0} assignation(s)`)
    allAssignments?.forEach((assignment, index) => {
      console.log(`\n   ${index + 1}. Assignment ID: ${assignment.id}`)
      console.log(`      Projet: ${assignment.projects?.title || 'PROJET INCONNU'}`)
      console.log(`      Profile: ${assignment.hr_profiles?.name || 'PROFILE INCONNU'}`)
      console.log(`      IA: ${assignment.hr_profiles?.is_ai ? 'OUI' : 'NON'}`)
      console.log(`      Status: ${assignment.booking_status}`)
      console.log(`      Candidate ID: ${assignment.candidate_id || 'NULL'}`)
    })
  }

  // 4. Recherche spécifique "IA book"
  console.log('\n🎯 ÉTAPE 4 : RECHERCHE SPÉCIFIQUE "IA BOOK"')

  // Essayer différentes variantes
  const searchTerms = ['IA book', 'ia book', 'IA Book', 'book', 'IA', 'ia']

  for (const term of searchTerms) {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .ilike('title', `%${term}%`)

    if (!error && projects && projects.length > 0) {
      console.log(`✅ Trouvé avec "${term}": ${projects.length} projet(s)`)
      projects.forEach(project => {
        console.log(`   - ${project.title} (ID: ${project.id})`)
      })
    }
  }

  // 5. Vérifier les candidate_profiles pour les IA
  console.log('\n👥 ÉTAPE 5 : PROFILS CANDIDATS IA')
  const { data: aiCandidates, error: candidateError } = await supabase
    .from('candidate_profiles')
    .select('*')
    .ilike('email', '%@ia.team%')

  if (candidateError) {
    console.error('❌ Erreur candidats IA:', candidateError)
  } else {
    console.log(`✅ Trouvé ${aiCandidates?.length || 0} candidat(s) IA`)
    aiCandidates?.forEach(candidate => {
      console.log(`   - ${candidate.first_name} ${candidate.last_name}`)
      console.log(`     Email: ${candidate.email}`)
      console.log(`     ID: ${candidate.id}`)
      console.log(`     Status: ${candidate.status}`)
    })
  }

} catch (error) {
  console.error('❌ Erreur générale:', error)
  process.exit(1)
}