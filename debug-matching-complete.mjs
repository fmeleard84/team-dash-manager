import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugMatching() {
  console.log('🔍 Analyse complète du problème de matching\n')
  console.log('='*50)

  try {
    // 1. Chercher le candidat par nom
    console.log('\n1️⃣ Recherche du candidat CDP FM 2708:')
    
    const { data: candidates, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select(`
        id,
        first_name,
        last_name,
        email,
        profile_id,
        seniority,
        status,
        qualification_status,
        language,
        expertise,
        created_at
      `)
      .or('first_name.ilike.%CDP%,last_name.ilike.%2708%,email.ilike.%ressource_27_08_cdp%')
    
    if (candidateError) {
      console.error('❌ Erreur recherche candidat:', candidateError)
      return
    }
    
    console.log(`Candidats trouvés: ${candidates.length}`)
    
    let targetCandidate = null
    candidates.forEach(c => {
      console.log(`\n  Candidat: ${c.first_name} ${c.last_name}`)
      console.log(`    - ID: ${c.id}`)
      console.log(`    - Email: ${c.email}`)
      console.log(`    - Métier: ${c.profile_id}`)
      console.log(`    - Séniorité: ${c.seniority}`)
      console.log(`    - Status: ${c.status}`)
      console.log(`    - Langue: ${c.language}`)
      console.log(`    - Expertise: ${c.expertise}`)
      
      if (c.first_name === 'CDP FM' && c.last_name === '2708') {
        targetCandidate = c
      }
    })
    
    if (!targetCandidate) {
      console.log('❌ Candidat CDP FM 2708 non trouvé')
      return
    }
    
    console.log(`\n✅ Candidat cible trouvé: ${targetCandidate.id}`)
    
    // 2. Chercher le projet "for cdp"
    console.log('\n2️⃣ Recherche du projet "for cdp":')
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        status,
        owner_id,
        created_at
      `)
      .ilike('name', '%for cdp%')
    
    if (projectError || !projects.length) {
      console.error('❌ Projet non trouvé:', projectError)
      return
    }
    
    const project = projects[0]
    console.log('Projet trouvé:')
    console.log(`  - ID: ${project.id}`)
    console.log(`  - Nom: ${project.name}`)
    console.log(`  - Status: ${project.status}`)
    console.log(`  - Date création: ${project.created_at}`)
    
    // 3. Vérifier les ressources demandées avec jointures
    console.log('\n3️⃣ Ressources demandées (avec détails):')
    const { data: resources, error: resourcesError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        profile_id,
        seniority,
        booking_status,
        candidate_id,
        language,
        expertise,
        hr_profiles!inner (
          id,
          label,
          name
        )
      `)
      .eq('project_id', project.id)
    
    if (resourcesError) {
      console.error('❌ Erreur ressources:', resourcesError)
      return
    }
    
    console.log(`\nNombre de ressources: ${resources.length}`)
    resources.forEach((r, i) => {
      console.log(`\nRessource ${i+1}:`)
      console.log(`  - Métier demandé: ${r.profile_id} (${r.hr_profiles?.label || 'N/A'})`)
      console.log(`  - Séniorité: ${r.seniority}`)
      console.log(`  - Langue: ${r.language}`)
      console.log(`  - Expertise: ${r.expertise}`)
      console.log(`  - Booking status: ${r.booking_status}`)
      console.log(`  - Candidat assigné: ${r.candidate_id || 'Aucun'}`)
    })
    
    // 4. Analyse du matching
    console.log('\n4️⃣ ANALYSE DU MATCHING:')
    console.log('='*40)
    
    const resource = resources[0]
    if (resource) {
      console.log('\n📋 Comparaison détaillée:')
      console.log('\nCandidat:')
      console.log(`  - Métier: "${targetCandidate.profile_id}"`)
      console.log(`  - Séniorité: "${targetCandidate.seniority}"`)
      console.log(`  - Langue: "${targetCandidate.language}"`)
      console.log(`  - Expertise: "${targetCandidate.expertise}"`)
      console.log(`  - Status: "${targetCandidate.status}"`)
      
      console.log('\nRessource demandée:')
      console.log(`  - Métier: "${resource.profile_id}"`)
      console.log(`  - Séniorité: "${resource.seniority}"`)
      console.log(`  - Langue: "${resource.language}"`)
      console.log(`  - Expertise: "${resource.expertise}"`)
      
      console.log('\n🔍 Vérification critère par critère:')
      
      // Comparaisons avec normalisation
      const normalizeString = (str) => str ? str.toLowerCase().trim() : ''
      
      const profileMatch = normalizeString(targetCandidate.profile_id) === normalizeString(resource.profile_id)
      console.log(`  1. Métier: ${profileMatch ? '✅' : '❌'} (${targetCandidate.profile_id} vs ${resource.profile_id})`)
      
      const seniorityMatch = normalizeString(targetCandidate.seniority) === normalizeString(resource.seniority)
      console.log(`  2. Séniorité: ${seniorityMatch ? '✅' : '❌'} (${targetCandidate.seniority} vs ${resource.seniority})`)
      
      const languageMatch = normalizeString(targetCandidate.language) === normalizeString(resource.language)
      console.log(`  3. Langue: ${languageMatch ? '✅' : '❌'} (${targetCandidate.language} vs ${resource.language})`)
      
      const expertiseMatch = normalizeString(targetCandidate.expertise) === normalizeString(resource.expertise)
      console.log(`  4. Expertise: ${expertiseMatch ? '✅' : '❌'} (${targetCandidate.expertise} vs ${resource.expertise})`)
      
      const statusValid = targetCandidate.status !== 'qualification'
      console.log(`  5. Status valide: ${statusValid ? '✅' : '❌'} (${targetCandidate.status})`)
      
      const allMatch = profileMatch && seniorityMatch && languageMatch && expertiseMatch && statusValid
      console.log(`\n📊 RÉSULTAT: ${allMatch ? '✅ MATCH COMPLET' : '❌ PAS DE MATCH'}`)
      
      if (!allMatch) {
        console.log('\n⚠️ PROBLÈMES IDENTIFIÉS:')
        if (!profileMatch) {
          console.log(`  ❌ Métier ne correspond pas:`)
          console.log(`     Candidat: "${targetCandidate.profile_id}"`)
          console.log(`     Demandé: "${resource.profile_id}"`)
        }
        if (!seniorityMatch) {
          console.log(`  ❌ Séniorité ne correspond pas:`)
          console.log(`     Candidat: "${targetCandidate.seniority}"`)
          console.log(`     Demandé: "${resource.seniority}"`)
        }
        if (!languageMatch) {
          console.log(`  ❌ Langue ne correspond pas:`)
          console.log(`     Candidat: "${targetCandidate.language}"`)
          console.log(`     Demandé: "${resource.language}"`)
        }
        if (!expertiseMatch) {
          console.log(`  ❌ Expertise ne correspond pas:`)
          console.log(`     Candidat: "${targetCandidate.expertise}"`)
          console.log(`     Demandé: "${resource.expertise}"`)
        }
        if (!statusValid) {
          console.log(`  ❌ Candidat en qualification`)
        }
      }
    }
    
    // 5. Vérifier le code de matching dans CandidateDashboard
    console.log('\n5️⃣ Vérification du code de matching:')
    console.log('Le matching se fait dans CandidateDashboard avec ces critères:')
    console.log('  1. profile_id (métier)')
    console.log('  2. seniority')
    console.log('  3. language')
    console.log('  4. expertise')
    console.log('  5. status !== "qualification"')
    console.log('  6. booking_status === "recherche"')
    
    // 6. Vérifier les notifications existantes
    console.log('\n6️⃣ Notifications pour ce candidat:')
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', targetCandidate.id)
      .order('created_at', { ascending: false })
      .limit(5)
    
    console.log(`Dernières notifications: ${notifications?.length || 0}`)
    notifications?.forEach(n => {
      console.log(`  - ${n.created_at}: ${n.title}`)
    })

  } catch (error) {
    console.error('Erreur inattendue:', error)
  }
}

debugMatching()