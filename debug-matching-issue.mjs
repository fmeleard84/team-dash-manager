import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugMatching() {
  console.log('🔍 Analyse du problème de matching candidat-projet\n')
  console.log('='*50)

  try {
    // 1. Trouver le candidat
    const candidateEmail = 'fmeleard+ressource_27_08_cdp@gmail.com'
    console.log(`\n1️⃣ Recherche du candidat: ${candidateEmail}`)
    
    const { data: authUser, error: authError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', candidateEmail)
      .single()
    
    if (authError || !authUser) {
      console.error('❌ Candidat non trouvé dans auth.users')
      return
    }
    
    console.log(`✅ Auth user trouvé: ${authUser.id}`)
    
    // 2. Vérifier le profil candidat
    console.log('\n2️⃣ Vérification du profil candidat:')
    const { data: candidateProfile, error: profileError } = await supabase
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
        expertise
      `)
      .eq('id', authUser.id)
      .single()
    
    if (profileError) {
      console.error('❌ Erreur profil candidat:', profileError)
      return
    }
    
    console.log('Profil candidat:')
    console.log(`  - ID: ${candidateProfile.id}`)
    console.log(`  - Nom: ${candidateProfile.first_name} ${candidateProfile.last_name}`)
    console.log(`  - Profile (métier): ${candidateProfile.profile_id}`)
    console.log(`  - Séniorité: ${candidateProfile.seniority}`)
    console.log(`  - Status: ${candidateProfile.status}`)
    console.log(`  - Qualification: ${candidateProfile.qualification_status}`)
    console.log(`  - Langue: ${candidateProfile.language}`)
    console.log(`  - Expertise: ${candidateProfile.expertise}`)
    
    // 3. Chercher le projet "for cdp"
    console.log('\n3️⃣ Recherche du projet "for cdp":')
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        status,
        owner_id,
        created_at
      `)
      .ilike('name', '%for cdp%')
      .single()
    
    if (projectError) {
      console.error('❌ Projet non trouvé:', projectError)
      return
    }
    
    console.log('Projet trouvé:')
    console.log(`  - ID: ${project.id}`)
    console.log(`  - Nom: ${project.name}`)
    console.log(`  - Status: ${project.status}`)
    console.log(`  - Owner: ${project.owner_id}`)
    
    // 4. Vérifier les ressources demandées
    console.log('\n4️⃣ Ressources demandées pour ce projet:')
    const { data: resources, error: resourcesError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        profile_id,
        seniority,
        booking_status,
        candidate_id,
        language,
        expertise
      `)
      .eq('project_id', project.id)
    
    if (resourcesError) {
      console.error('❌ Erreur ressources:', resourcesError)
      return
    }
    
    console.log(`Nombre de ressources: ${resources.length}`)
    resources.forEach((r, i) => {
      console.log(`\nRessource ${i+1}:`)
      console.log(`  - Profile demandé: ${r.profile_id}`)
      console.log(`  - Séniorité demandée: ${r.seniority}`)
      console.log(`  - Langue demandée: ${r.language}`)
      console.log(`  - Expertise demandée: ${r.expertise}`)
      console.log(`  - Booking status: ${r.booking_status}`)
      console.log(`  - Candidat assigné: ${r.candidate_id || 'Aucun'}`)
    })
    
    // 5. Vérifier le matching
    console.log('\n5️⃣ Analyse du matching:')
    console.log('Comparaison candidat vs ressource demandée:')
    
    const resource = resources[0] // Prendre la première ressource
    if (resource) {
      console.log('\n📋 Critères de matching:')
      
      // Profile
      const profileMatch = candidateProfile.profile_id === resource.profile_id
      console.log(`  ✓ Profile: ${candidateProfile.profile_id} === ${resource.profile_id} ? ${profileMatch ? '✅' : '❌'}`)
      
      // Seniority
      const seniorityMatch = candidateProfile.seniority === resource.seniority
      console.log(`  ✓ Séniorité: ${candidateProfile.seniority} === ${resource.seniority} ? ${seniorityMatch ? '✅' : '❌'}`)
      
      // Language
      const languageMatch = candidateProfile.language === resource.language
      console.log(`  ✓ Langue: ${candidateProfile.language} === ${resource.language} ? ${languageMatch ? '✅' : '❌'}`)
      
      // Expertise
      const expertiseMatch = candidateProfile.expertise === resource.expertise
      console.log(`  ✓ Expertise: ${candidateProfile.expertise} === ${resource.expertise} ? ${expertiseMatch ? '✅' : '❌'}`)
      
      // Status
      const statusValid = candidateProfile.status !== 'qualification'
      console.log(`  ✓ Status valide: ${candidateProfile.status} !== 'qualification' ? ${statusValid ? '✅' : '❌'}`)
      
      const allMatch = profileMatch && seniorityMatch && languageMatch && expertiseMatch && statusValid
      console.log(`\n📊 Résultat du matching: ${allMatch ? '✅ MATCH COMPLET' : '❌ PAS DE MATCH'}`)
      
      if (!allMatch) {
        console.log('\n⚠️ Problèmes identifiés:')
        if (!profileMatch) console.log('  - Le métier ne correspond pas')
        if (!seniorityMatch) console.log('  - La séniorité ne correspond pas')
        if (!languageMatch) console.log('  - La langue ne correspond pas')
        if (!expertiseMatch) console.log('  - L\'expertise ne correspond pas')
        if (!statusValid) console.log('  - Le candidat est en qualification')
      }
    }
    
    // 6. Vérifier les notifications
    console.log('\n6️⃣ Vérification des notifications:')
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', candidateProfile.id)
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (notifError) {
      console.error('❌ Erreur notifications:', notifError)
    } else {
      console.log(`Notifications trouvées: ${notifications.length}`)
      notifications.forEach(n => {
        console.log(`  - ${n.created_at}: ${n.type} - ${n.title}`)
      })
    }
    
    // 7. Vérifier les formats des données
    console.log('\n7️⃣ Analyse des formats de données:')
    console.log('\nTypes de données candidat:')
    console.log(`  - language: ${typeof candidateProfile.language} = "${candidateProfile.language}"`)
    console.log(`  - expertise: ${typeof candidateProfile.expertise} = "${candidateProfile.expertise}"`)
    console.log(`  - profile_id: ${typeof candidateProfile.profile_id} = "${candidateProfile.profile_id}"`)
    console.log(`  - seniority: ${typeof candidateProfile.seniority} = "${candidateProfile.seniority}"`)
    
    console.log('\nTypes de données ressource:')
    if (resource) {
      console.log(`  - language: ${typeof resource.language} = "${resource.language}"`)
      console.log(`  - expertise: ${typeof resource.expertise} = "${resource.expertise}"`)
      console.log(`  - profile_id: ${typeof resource.profile_id} = "${resource.profile_id}"`)
      console.log(`  - seniority: ${typeof resource.seniority} = "${resource.seniority}"`)
    }

  } catch (error) {
    console.error('Erreur inattendue:', error)
  }
}

debugMatching()