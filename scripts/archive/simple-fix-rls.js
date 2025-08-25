import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
// Utiliser la clé anon normale pour les tests
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function directRLSFix() {
  console.log('🔧 Application directe de la correction RLS...');
  
  try {
    // 1. Essayer de créer directement un profil candidat avec les privilèges service
    console.log('\n1️⃣ Test de création directe avec service role...');
    
    const { data: directTest, error: directError } = await supabase
      .from('candidate_profiles')
      .insert({
        email: 'fmeleard+ressource_5@gmail.com',
        first_name: 'Meleard R',
        last_name: 'Francis R',
        qualification_status: 'pending',
        password_hash: '' // Ajouter un password_hash vide
      })
      .select()
      .single();
    
    if (directError) {
      console.error('❌ Création directe échouée:', directError);
      
      // 2. Essayer une approche alternative - créer via un upsert
      console.log('\n2️⃣ Test avec upsert...');
      const { data: upsertTest, error: upsertError } = await supabase
        .from('candidate_profiles')
        .upsert({
          email: 'fmeleard+ressource_5@gmail.com',
          first_name: 'Meleard R',
          last_name: 'Francis R',
          qualification_status: 'pending',
          password_hash: '' // Ajouter un password_hash vide
        }, {
          onConflict: 'email'
        })
        .select()
        .single();
      
      if (upsertError) {
        console.error('❌ Upsert échoué:', upsertError);
      } else {
        console.log('✅ Profil créé via upsert:', upsertTest);
      }
      
    } else {
      console.log('✅ Profil créé directement:', directTest);
    }
    
    // 3. Vérifier le profil maintenant
    console.log('\n3️⃣ Vérification du profil...');
    const { data: checkProfile, error: checkError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('email', 'fmeleard+ressource_5@gmail.com')
      .single();
    
    if (checkError) {
      console.error('❌ Profil non trouvé:', checkError);
    } else {
      console.log('✅ Profil confirmé:', checkProfile);
    }
    
  } catch (error) {
    console.error('💥 Erreur lors de la création:', error);
  }
}

directRLSFix();