import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
)

console.log('🧪 TEST DE LA JOINTURE APRÈS CORRECTION')
console.log('======================================')

async function testJointure() {
  console.log('\n🔍 Test 1: Jointure hr_resource_assignments → hr_profiles')

  try {
    const { data, error } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        profile_id,
        booking_status,
        hr_profiles (
          id,
          name,
          is_ai,
          prompt_id
        )
      `)
      .limit(5)

    if (error) {
      console.log('❌ ÉCHEC - Jointure toujours impossible:')
      console.log('   Code:', error.code)
      console.log('   Message:', error.message)
      console.log('   Détails:', error.details)
      return false
    } else {
      console.log('✅ SUCCÈS - Jointure fonctionnelle!')
      console.log('   Résultats trouvés:', data?.length || 0)

      if (data && data.length > 0) {
        console.log('\n📋 Exemple de données:')
        data.forEach((item, index) => {
          console.log(`   ${index + 1}. Assignment ${item.id}:`)
          console.log(`      Profile: ${item.hr_profiles?.name || 'NULL'} (${item.hr_profiles?.is_ai ? 'IA' : 'Humain'})`)
          console.log(`      Status: ${item.booking_status}`)
        })
      }
      return true
    }
  } catch (err) {
    console.log('❌ Exception:', err.message)
    return false
  }
}

async function testProjectWithIA() {
  console.log('\n🎯 Test 2: Recherche du projet IA book avec la nouvelle jointure')

  try {
    // D'abord récupérer tous les projets
    const { data: projects } = await supabase
      .from('projects')
      .select('id, title, status')
      .or('title.ilike.%IA%, title.ilike.%book%')

    console.log('Projets trouvés:', projects?.length || 0)

    if (!projects || projects.length === 0) {
      console.log('❌ Aucun projet IA/book trouvé')
      return
    }

    // Pour chaque projet, tester la nouvelle jointure
    for (const project of projects) {
      console.log(`\n🔍 Analyse projet: ${project.title}`)

      const { data: assignments, error } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          profile_id,
          candidate_id,
          booking_status,
          hr_profiles (
            id,
            name,
            is_ai,
            prompt_id
          )
        `)
        .eq('project_id', project.id)

      if (error) {
        console.log('❌ Erreur jointure pour ce projet:', error.message)
        continue
      }

      console.log(`   Assignations: ${assignments?.length || 0}`)

      if (assignments && assignments.length > 0) {
        const iaAssignments = assignments.filter(a => a.hr_profiles?.is_ai)
        const humanAssignments = assignments.filter(a => a.hr_profiles && !a.hr_profiles.is_ai)

        console.log(`   - ${iaAssignments.length} IA(s)`)
        console.log(`   - ${humanAssignments.length} Humain(s)`)

        iaAssignments.forEach(ia => {
          console.log(`     🤖 ${ia.hr_profiles.name} (Status: ${ia.booking_status})`)
        })
      }
    }

  } catch (err) {
    console.log('❌ Exception test projet:', err.message)
  }
}

// Exécuter les tests
async function runAllTests() {
  const joinWorking = await testJointure()

  if (joinWorking) {
    await testProjectWithIA()
    console.log('\n🎉 CONCLUSION: La correction de la clé étrangère fonctionne!')
    console.log('   → Les jointures directes sont maintenant possibles')
    console.log('   → Plus besoin de 2 requêtes séparées')
    console.log('   → Performance améliorée sur tout le site')
  } else {
    console.log('\n⚠️ CONCLUSION: La migration doit encore être appliquée')
    console.log('   → Exécuter le fichier fix-hr-profiles-foreign-key.sql')
    console.log('   → Via Dashboard Supabase > SQL Editor')
  }
}

runAllTests().catch(console.error)