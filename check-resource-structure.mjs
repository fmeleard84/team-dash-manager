import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkJXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStructure() {
  console.log('🔍 Vérification de la structure des tables\n')
  
  try {
    // 1. Récupérer un assignment de test
    console.log('1️⃣ Structure hr_resource_assignments:')
    const { data: assignments, error } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Erreur:', error)
      return
    }
    
    if (assignments && assignments[0]) {
      const keys = Object.keys(assignments[0])
      console.log('Colonnes disponibles:')
      keys.forEach(key => {
        const value = assignments[0][key]
        console.log(`  - ${key}: ${typeof value} = ${JSON.stringify(value)}`)
      })
    }
    
    // 2. Récupérer les assignments pour le projet "for cdp"
    console.log('\n2️⃣ Assignments du projet "for cdp":')
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .ilike('name', '%for cdp%')
      .single()
    
    if (projects) {
      const { data: projectAssignments } = await supabase
        .from('hr_resource_assignments')
        .select('*')
        .eq('project_id', projects.id)
      
      console.log(`\nPour le projet "${projects.name}" (${projects.id}):`)
      projectAssignments?.forEach((a, i) => {
        console.log(`\nRessource ${i+1}:`)
        console.log(`  - profile_id: ${a.profile_id}`)
        console.log(`  - seniority: ${a.seniority}`)
        console.log(`  - language: ${a.language} (type: ${typeof a.language})`)
        console.log(`  - languages: ${a.languages} (type: ${typeof a.languages})`)
        console.log(`  - expertise: ${a.expertise} (type: ${typeof a.expertise})`)
        console.log(`  - expertises: ${a.expertises} (type: ${typeof a.expertises})`)
        console.log(`  - booking_status: ${a.booking_status}`)
      })
    }
    
    // 3. Vérifier la structure de candidate_languages
    console.log('\n3️⃣ Structure candidate_languages:')
    const { data: candLang } = await supabase
      .from('candidate_languages')
      .select('*')
      .limit(1)
    
    if (candLang && candLang[0]) {
      console.log('Colonnes:')
      Object.keys(candLang[0]).forEach(key => {
        console.log(`  - ${key}: ${typeof candLang[0][key]}`)
      })
    }
    
    // 4. Vérifier la structure de candidate_expertises
    console.log('\n4️⃣ Structure candidate_expertises:')
    const { data: candExp } = await supabase
      .from('candidate_expertises')
      .select('*')
      .limit(1)
    
    if (candExp && candExp[0]) {
      console.log('Colonnes:')
      Object.keys(candExp[0]).forEach(key => {
        console.log(`  - ${key}: ${typeof candExp[0][key]}`)
      })
    }
    
    // 5. Vérifier les langues/expertises du candidat CDP FM 2708
    console.log('\n5️⃣ Skills du candidat CDP FM 2708:')
    const { data: candidate } = await supabase
      .from('candidate_profiles')
      .select('id, first_name, last_name')
      .eq('first_name', 'CDP FM')
      .eq('last_name', '2708')
      .single()
    
    if (candidate) {
      console.log(`Candidat trouvé: ${candidate.id}`)
      
      // Langues
      const { data: langs } = await supabase
        .from('candidate_languages')
        .select(`
          language_id,
          hr_languages (name)
        `)
        .eq('candidate_id', candidate.id)
      
      console.log('\nLangues:')
      langs?.forEach(l => {
        console.log(`  - ${l.hr_languages?.name} (ID: ${l.language_id})`)
      })
      
      // Expertises
      const { data: exps } = await supabase
        .from('candidate_expertises')
        .select(`
          expertise_id,
          hr_expertises (name)
        `)
        .eq('candidate_id', candidate.id)
      
      console.log('\nExpertises:')
      exps?.forEach(e => {
        console.log(`  - ${e.hr_expertises?.name} (ID: ${e.expertise_id})`)
      })
    }
    
  } catch (error) {
    console.error('Erreur:', error)
  }
}

checkStructure()