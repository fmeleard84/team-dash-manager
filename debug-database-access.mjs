import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
)

console.log('🔍 DEBUG - ACCÈS BASE DE DONNÉES')
console.log('=================================')

try {
  // 1. Test de connectivité basic
  console.log('\n🔗 Test de connectivité...')
  const { data: testData, error: testError } = await supabase
    .from('profiles')
    .select('count')
    .limit(1)

  if (testError) {
    console.log('❌ Erreur connectivité:', testError.message)
  } else {
    console.log('✅ Connexion OK')
  }

  // 2. Compter les entrées dans chaque table importante
  console.log('\n📊 COMPTAGE TABLES:')

  const tables = [
    'projects',
    'hr_profiles',
    'hr_resource_assignments',
    'candidate_profiles',
    'profiles'
  ]

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`   ${table}: ❌ ${error.message}`)
      } else {
        console.log(`   ${table}: ${count} entrées`)
      }
    } catch (e) {
      console.log(`   ${table}: ❌ Exception: ${e.message}`)
    }
  }

  // 3. Vérifier les profils HR avec IA
  console.log('\n🤖 PROFILS IA DISPONIBLES:')
  const { data: aiProfiles, error: aiError } = await supabase
    .from('hr_profiles')
    .select('id, name, is_ai, prompt_id')
    .eq('is_ai', true)

  if (aiError) {
    console.log('❌ Erreur profils IA:', aiError.message)
  } else if (!aiProfiles || aiProfiles.length === 0) {
    console.log('📭 Aucun profil IA trouvé')
  } else {
    console.log(`✅ ${aiProfiles.length} profil(s) IA trouvé(s):`)
    aiProfiles.forEach(profile => {
      console.log(`   - ${profile.name} (ID: ${profile.id})`)
      console.log(`     Prompt: ${profile.prompt_id || 'Non configuré'}`)
    })
  }

  // 4. Vérifier les assignations récentes
  console.log('\n📋 ASSIGNATIONS RÉCENTES (toutes):')
  const { data: allAssignments, error: assignmentError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      id,
      project_id,
      profile_id,
      candidate_id,
      booking_status,
      created_at,
      hr_profiles (
        name,
        is_ai
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  if (assignmentError) {
    console.log('❌ Erreur assignations:', assignmentError.message)
  } else if (!allAssignments || allAssignments.length === 0) {
    console.log('📭 Aucune assignation trouvée')
  } else {
    console.log(`✅ ${allAssignments.length} assignation(s) récente(s):`)
    allAssignments.forEach(assignment => {
      const profileName = assignment.hr_profiles?.name || 'Profil inconnu'
      const isAI = assignment.hr_profiles?.is_ai ? '🤖' : '👤'
      console.log(`   ${isAI} ${profileName}`)
      console.log(`      Project: ${assignment.project_id}`)
      console.log(`      Status: ${assignment.booking_status}`)
      console.log(`      Created: ${assignment.created_at}`)
    })
  }

  // 5. Chercher des projets avec des patterns différents
  console.log('\n🔎 RECHERCHE ÉLARGIE DE PROJETS:')

  const searchPatterns = [
    { name: 'Tous les projets', filter: null },
    { name: 'Projets avec "test"', filter: 'title.ilike.%test%' },
    { name: 'Projets récents', filter: null, limit: 5 }
  ]

  for (const pattern of searchPatterns) {
    try {
      let query = supabase
        .from('projects')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false })

      if (pattern.filter) {
        query = query.or(pattern.filter)
      }
      if (pattern.limit) {
        query = query.limit(pattern.limit)
      }

      const { data: projects, error: projectError } = await query

      if (projectError) {
        console.log(`   ${pattern.name}: ❌ ${projectError.message}`)
      } else if (!projects || projects.length === 0) {
        console.log(`   ${pattern.name}: 📭 Aucun résultat`)
      } else {
        console.log(`   ${pattern.name}: ✅ ${projects.length} projet(s)`)
        projects.forEach(project => {
          console.log(`      - ${project.title} (${project.status})`)
        })
      }
    } catch (e) {
      console.log(`   ${pattern.name}: ❌ Exception: ${e.message}`)
    }
  }

  // 6. Vérifier l'utilisateur connecté
  console.log('\n👤 UTILISATEUR CONNECTÉ:')
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError) {
    console.log('❌ Pas d\'utilisateur connecté:', userError.message)
  } else if (!user) {
    console.log('📭 Aucun utilisateur connecté')
  } else {
    console.log(`✅ Utilisateur: ${user.email} (${user.id})`)
  }

} catch (error) {
  console.error('❌ Erreur générale:', error)
  process.exit(1)
}