// Vérifier le lien entre profiles et candidate_profiles
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkProfilesLink() {
  console.log('🔗 Vérification du lien entre profiles et candidate_profiles\n')

  try {
    // 1. Vérifier la table profiles
    console.log('📊 1. Vérification table profiles...')
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role')
      .eq('email', 'fmeleard+ressource_27_08_cdp@gmail.com')

    if (profilesError) {
      console.log('❌ Erreur profiles:', profilesError.message)
    } else {
      console.log('✅ Profiles trouvés:', profilesData)
    }

    // 2. Vérifier candidate_profiles 
    console.log('\n📊 2. Vérification candidate_profiles...')
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id, email, user_id, first_name')
      .eq('email', 'fmeleard+ressource_27_08_cdp@gmail.com')

    if (candidateError) {
      console.log('❌ Erreur candidate_profiles:', candidateError.message)
    } else {
      console.log('✅ Candidate_profiles trouvé:', candidateData)
    }

    // 3. Comparer les IDs
    if (profilesData?.[0] && candidateData?.[0]) {
      console.log('\n🔍 3. Comparaison des IDs...')
      const profileId = profilesData[0].id
      const candidateUserId = candidateData[0].user_id
      
      console.log(`   📊 Profiles.id: ${profileId}`)
      console.log(`   👤 Candidate_profiles.user_id: ${candidateUserId}`)
      console.log(`   ✅ Match: ${profileId === candidateUserId ? 'OUI' : 'NON'}`)

      if (profileId !== candidateUserId) {
        console.log('\n❌ PROBLÈME IDENTIFIÉ:')
        console.log('   Les IDs ne correspondent pas !')
        console.log('   profiles.id ≠ candidate_profiles.user_id')
        console.log('')
        console.log('💡 SOLUTIONS POSSIBLES:')
        console.log('   1. Corriger candidate_profiles.user_id pour qu\'il corresponde à profiles.id')
        console.log('   2. Modifier les politiques RLS pour utiliser profiles au lieu de candidate_profiles')
        console.log('   3. Créer un trigger pour synchroniser automatiquement')
      } else {
        console.log('\n✅ CORRESPONDANCE OK')
        console.log('   Le problème doit être ailleurs (session d\'authentification)')
      }
    }

    // 4. Vérifier s'il existe d'autres candidats avec des IDs correspondants
    console.log('\n📊 4. Vérification globale correspondances...')
    const { data: allCandidates, error: allCandidatesError } = await supabase
      .from('candidate_profiles')
      .select('id, email, user_id, first_name')
      .limit(5)

    if (allCandidatesError) {
      console.log('❌ Erreur all candidates:', allCandidatesError.message)
    } else {
      console.log('✅ Échantillon candidates (5 premiers):')
      
      for (const candidate of allCandidates || []) {
        // Vérifier si ce user_id existe dans profiles
        const { data: matchingProfile } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('id', candidate.user_id)
          .single()

        console.log(`   👤 ${candidate.first_name} (${candidate.email})`)
        console.log(`      user_id: ${candidate.user_id}`)
        console.log(`      profiles match: ${matchingProfile ? '✅' : '❌'}`)
      }
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

checkProfilesLink()