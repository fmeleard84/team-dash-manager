import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
)

console.log('🔍 ANALYSE DU SCHÉMA ET DES JOINTURES')
console.log('====================================')

async function testJointures() {
  console.log('\n📊 TEST 1: Jointure directe hr_resource_assignments → hr_profiles')
  console.log('----------------------------------------------------------------')

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
      console.error('❌ ERREUR JOINTURE DIRECTE:', error)
      console.log('Code:', error.code)
      console.log('Message:', error.message)
      console.log('Détails:', error.details)
      console.log('Hint:', error.hint)
    } else {
      console.log('✅ JOINTURE DIRECTE FONCTIONNE!')
      console.log('Résultats:', data?.length || 0)
      if (data && data.length > 0) {
        console.log('Premier résultat:', JSON.stringify(data[0], null, 2))
      }
    }
  } catch (err) {
    console.error('❌ Exception jointure directe:', err)
  }

  console.log('\n📊 TEST 2: Vérification existence des tables')
  console.log('---------------------------------------------')

  try {
    // Test hr_resource_assignments
    const { data: assignments, error: assignError } = await supabase
      .from('hr_resource_assignments')
      .select('id, profile_id, project_id')
      .limit(3)

    console.log('hr_resource_assignments:', {
      accessible: !assignError,
      count: assignments?.length || 0,
      error: assignError?.message
    })

    // Test hr_profiles
    const { data: profiles, error: profileError } = await supabase
      .from('hr_profiles')
      .select('id, name, is_ai')
      .limit(3)

    console.log('hr_profiles:', {
      accessible: !profileError,
      count: profiles?.length || 0,
      error: profileError?.message
    })

    // Vérifier s'il y a des profile_id qui existent dans hr_profiles
    if (assignments && assignments.length > 0 && profiles && profiles.length > 0) {
      console.log('\n🔍 VÉRIFICATION DES RÉFÉRENCES:')

      const profileIds = assignments.map(a => a.profile_id).filter(Boolean)
      const existingIds = profiles.map(p => p.id)

      console.log('Profile IDs dans assignments:', profileIds)
      console.log('IDs existants dans hr_profiles:', existingIds)

      const validReferences = profileIds.filter(id => existingIds.includes(id))
      console.log('Références valides:', validReferences.length, '/', profileIds.length)
    }

  } catch (err) {
    console.error('❌ Exception test tables:', err)
  }

  console.log('\n📊 TEST 3: Jointure alternative avec candidate_profiles')
  console.log('--------------------------------------------------------')

  try {
    const { data, error } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        candidate_id,
        booking_status,
        candidate_profiles (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .limit(5)

    if (error) {
      console.error('❌ ERREUR JOINTURE CANDIDATE_PROFILES:', error)
    } else {
      console.log('✅ JOINTURE CANDIDATE_PROFILES FONCTIONNE!')
      console.log('Résultats:', data?.length || 0)
      if (data && data.length > 0) {
        console.log('Premier résultat avec candidat:', JSON.stringify(data[0], null, 2))
      }
    }
  } catch (err) {
    console.error('❌ Exception jointure candidate_profiles:', err)
  }

  console.log('\n📊 TEST 4: Analyse des noms de colonnes et typage')
  console.log('--------------------------------------------------')

  try {
    // Récupérer quelques assignments pour analyser la structure
    const { data: assignmentSample } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .limit(1)

    if (assignmentSample && assignmentSample.length > 0) {
      console.log('Structure hr_resource_assignments:')
      const sample = assignmentSample[0]
      Object.entries(sample).forEach(([key, value]) => {
        console.log(`  ${key}: ${typeof value} = ${value}`)
      })
    }

    // Récupérer quelques profiles
    const { data: profileSample } = await supabase
      .from('hr_profiles')
      .select('*')
      .limit(1)

    if (profileSample && profileSample.length > 0) {
      console.log('\nStructure hr_profiles:')
      const sample = profileSample[0]
      Object.entries(sample).forEach(([key, value]) => {
        console.log(`  ${key}: ${typeof value} = ${value}`)
      })
    }

  } catch (err) {
    console.error('❌ Exception analyse structure:', err)
  }
}

// Lancer l'analyse
testJointures().catch(console.error)