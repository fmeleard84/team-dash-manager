import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function fixExistingIA() {
  console.log('🔧 Correction de l\'IA existante "Concepteur rédacteur IA"...\n');

  // L'ID de l'IA trouvée précédemment
  const iaId = 'f6005986-2af1-48c7-bcb5-8a2e0d952bb6';
  const iaName = 'Concepteur rédacteur IA';

  console.log('ID de l\'IA:', iaId);

  // Vérifier si le profil principal existe
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', iaId)
    .single();

  if (existingProfile) {
    console.log('✅ Le profil principal existe déjà');
  } else {
    console.log('❌ Profil principal manquant - création...');

    // Créer le profil principal avec la clé anon (en tant qu'admin)
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        INSERT INTO profiles (
          id,
          email,
          first_name,
          last_name,
          created_at,
          updated_at
        ) VALUES (
          '${iaId}',
          'concepteur_rédacteur_ia@ia.team',
          'IA',
          '${iaName}',
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO NOTHING
        RETURNING *;
      `
    });

    if (error) {
      console.error('Erreur:', error);

      // Si exec_sql ne fonctionne pas, on va créer une Edge Function
      console.log('La méthode directe ne fonctionne pas. Une Edge Function est nécessaire.');
    } else {
      console.log('✅ Profil principal créé !');
    }
  }

  // Vérifier que tout est OK maintenant
  console.log('\n🔍 Vérification finale...');

  const { data: candidateProfile } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('id', iaId)
    .single();

  if (candidateProfile) {
    console.log('✅ Profil candidat existe');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', iaId)
    .single();

  if (profile) {
    console.log('✅ Profil principal existe');
    console.log('\n✨ L\'IA devrait maintenant apparaître dans la messagerie !');
  } else {
    console.log('❌ Profil principal toujours manquant');
    console.log('Une Edge Function avec service_role est nécessaire pour créer ce profil.');
  }
}

fixExistingIA().catch(console.error);