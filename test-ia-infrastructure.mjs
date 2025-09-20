import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
)

console.log('🔍 Vérification de l\'infrastructure IA pour la messagerie...')

try {
  const { data, error } = await supabase.functions.invoke('check-ia-messaging-infrastructure', {
    body: {}
  })

  if (error) {
    console.error('❌ Erreur lors de l\'appel de la fonction:', error)
    process.exit(1)
  }

  console.log('\n📊 RÉSULTATS DE L\'ANALYSE:')
  console.log('==================================')

  if (data.success) {
    const { projects, summary, availablePrompts } = data.data

    console.log(`\n🎯 RÉSUMÉ:`)
    console.log(`   - Projets trouvés: ${summary.totalProjects}`)
    console.log(`   - Ressources IA: ${summary.totalAIResources}`)
    console.log(`   - Ressources humaines: ${summary.totalHumanResources}`)
    console.log(`   - Prompts IA actifs: ${summary.activePrompts}`)

    console.log(`\n📋 DÉTAIL DES PROJETS:`)
    projects.forEach((projectDetail, index) => {
      console.log(`\n  ${index + 1}. ${projectDetail.project.title} (${projectDetail.project.status})`)
      console.log(`     ID: ${projectDetail.project.id}`)

      if (projectDetail.aiResources.length > 0) {
        console.log(`     🤖 Ressources IA (${projectDetail.aiResources.length}):`)
        projectDetail.aiResources.forEach(ai => {
          console.log(`       - ${ai.hr_profiles.name}`)
          console.log(`         Status: ${ai.booking_status}`)
          console.log(`         Prompt ID: ${ai.hr_profiles.prompt_id || 'Non configuré'}`)
          console.log(`         Candidate ID: ${ai.candidate_id || 'Non assigné'}`)
        })
      }

      if (projectDetail.humanResources.length > 0) {
        console.log(`     👥 Ressources humaines (${projectDetail.humanResources.length}):`)
        projectDetail.humanResources.forEach(human => {
          console.log(`       - ${human.hr_profiles.name} (${human.booking_status})`)
        })
      }
    })

    if (availablePrompts.length > 0) {
      console.log(`\n🧠 PROMPTS IA DISPONIBLES:`)
      availablePrompts.forEach(prompt => {
        console.log(`   - ${prompt.name} (${prompt.context}) - ID: ${prompt.id}`)
      })
    }

    console.log(`\n✅ Infrastructure IA analysée avec succès!`)

    // Recommandations
    console.log(`\n💡 RECOMMANDATIONS:`)
    if (summary.totalAIResources === 0) {
      console.log(`   ⚠️ Aucune ressource IA trouvée. Vérifiez la configuration.`)
    } else {
      console.log(`   ✅ ${summary.totalAIResources} ressource(s) IA détectée(s).`)
    }

    if (summary.activePrompts === 0) {
      console.log(`   ⚠️ Aucun prompt IA actif. Configuration nécessaire.`)
    } else {
      console.log(`   ✅ ${summary.activePrompts} prompt(s) IA actif(s).`)
    }

  } else {
    console.log(`❌ ${data.message}`)
  }

} catch (error) {
  console.error('❌ Erreur lors de l\'analyse:', error)
  process.exit(1)
}