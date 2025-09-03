// Test d'authentification pour vérifier auth.uid()
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAuthUID() {
  console.log('🔐 Test d\'authentification et auth.uid()\n')

  try {
    // 1. Vérifier l'utilisateur actuellement connecté (anonyme)
    console.log('👤 1. Utilisateur actuel (anonyme)...')
    const { data: user, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log('❌ Erreur utilisateur:', userError.message)
    } else {
      console.log('✅ Utilisateur actuel:', user?.user?.id || 'Aucun (anonyme)')
      console.log('   📧 Email:', user?.user?.email || 'Aucun')
    }

    // 2. Tenter de se connecter avec les credentials du candidat
    console.log('\n🔑 2. Tentative de connexion candidat...')
    
    // On va essayer de comprendre comment le candidat devrait être authentifié
    // D'abord, regardons si il y a des sessions actives ou des credentials stockés
    
    // Récupérer les infos candidat à nouveau
    const { data: candidateData } = await supabase
      .from('candidate_profiles')
      .select('id, first_name, user_id, email')
      .eq('first_name', 'CDP FM 2708')
      .single()

    if (candidateData) {
      console.log('✅ Candidat trouvé:')
      console.log(`   🆔 Profile ID: ${candidateData.id}`)
      console.log(`   🆔 User ID: ${candidateData.user_id}`)
      console.log(`   📧 Email: ${candidateData.email}`)
      
      // 3. Simuler une tentative d'upload pour voir l'erreur exacte
      console.log('\n📤 3. Test d\'upload simulé...')
      
      try {
        const testFile = new Blob(['Test content'], { type: 'text/plain' })
        const filePath = 'projects/d7dff6ec-5019-40ab-a00f-8bac8806eca7/test-upload.txt'
        
        console.log(`   📁 Chemin: ${filePath}`)
        console.log('   📤 Tentative d\'upload...')
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, testFile, { upsert: true })
        
        if (uploadError) {
          console.log('❌ Erreur upload:', uploadError)
          console.log('   🔍 Message:', uploadError.message)
          console.log('   🔍 Details:', uploadError.details || 'Aucun détail')
        } else {
          console.log('✅ Upload réussi:', uploadData)
        }
        
      } catch (uploadErr) {
        console.log('❌ Exception upload:', uploadErr.message)
      }
      
      // 4. Vérifier les permissions buckets
      console.log('\n🪣 4. Test permissions bucket...')
      
      try {
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
        
        if (bucketError) {
          console.log('❌ Erreur buckets:', bucketError.message)
        } else {
          console.log('✅ Buckets accessibles:', buckets.length)
          buckets.forEach(bucket => {
            console.log(`   📁 ${bucket.id} (${bucket.public ? 'public' : 'private'})`)
          })
        }
      } catch (bucketErr) {
        console.log('❌ Exception buckets:', bucketErr.message)
      }
    }
    
    // 5. Analyser la différence client vs candidat
    console.log('\n🔍 5. Analyse client vs candidat...')
    
    console.log('❌ PROBLÈME IDENTIFIÉ:')
    console.log('   Le candidat n\'est PAS authentifié (session anonyme)')
    console.log('   Les politiques RLS requirent auth.uid() = candidate_profiles.user_id')
    console.log('   Mais sans authentification, auth.uid() est NULL ou anonyme')
    console.log('')
    console.log('💡 SOLUTION:')
    console.log('   1. Le candidat doit être connecté/authentifié avec son compte')
    console.log('   2. Vérifier que candidate_profiles.user_id correspond à l\'auth.users.id')
    console.log('   3. S\'assurer que la session d\'authentification est valide')

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

testAuthUID()