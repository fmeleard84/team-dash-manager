import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMissingClientProfiles() {
  console.log('=== CORRECTION DES PROFILS MANQUANTS ===\n');

  try {
    // Récupérer TOUS les profils
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('❌ Erreur lors de la récupération des profils:', profilesError);
      return;
    }

    console.log(`📊 ${profiles.length} profils trouvés\n`);

    let clientsFixed = 0;
    let candidatesFixed = 0;

    for (const profile of profiles) {
      // Déterminer le type basé sur l'email
      const isClient = profile.email.includes('client') || profile.email.includes('clienr');
      
      if (isClient) {
        // Vérifier si le profil client existe
        const { data: clientProfile, error: checkError } = await supabase
          .from('client_profiles')
          .select('id')
          .eq('id', profile.id)
          .single();

        if (checkError && checkError.code === 'PGRST116') {
          // Le profil client n'existe pas, le créer
          console.log(`⚠️ Client profile manquant pour: ${profile.email}`);
          
          const clientData = {
            id: profile.id,
            company_name: profile.company_name || 'Company',
            email: profile.email || '',
            phone: profile.phone || '',
            first_name: profile.first_name || '',
            last_name: profile.last_name || ''
          };

          const { error: createError } = await supabase
            .from('client_profiles')
            .insert(clientData);

          if (createError) {
            console.error(`   ❌ Erreur: ${createError.message}`);
          } else {
            console.log(`   ✅ Client profile créé`);
            
            // Mettre à jour le rôle dans profiles
            await supabase
              .from('profiles')
              .update({ role: 'client', user_type: 'client' })
              .eq('id', profile.id);
              
            clientsFixed++;
          }
        }
      } else {
        // C'est un candidat
        const { data: candidateProfile, error: checkError } = await supabase
          .from('candidate_profiles')
          .select('id')
          .eq('id', profile.id)
          .single();

        if (checkError && checkError.code === 'PGRST116') {
          // Le profil candidat n'existe pas, le créer
          console.log(`⚠️ Candidate profile manquant pour: ${profile.email}`);
          
          const candidateData = {
            id: profile.id,
            email: profile.email || '',
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            phone: profile.phone || '',
            status: 'disponible',
            qualification_status: 'pending',
            seniority: 'junior',
            profile_id: null,
            daily_rate: 0,
            password_hash: '',
            is_email_verified: true
          };

          const { error: createError } = await supabase
            .from('candidate_profiles')
            .insert(candidateData);

          if (createError) {
            console.error(`   ❌ Erreur: ${createError.message}`);
          } else {
            console.log(`   ✅ Candidate profile créé`);
            
            // Mettre à jour le rôle dans profiles
            await supabase
              .from('profiles')
              .update({ role: 'candidate', user_type: 'candidate' })
              .eq('id', profile.id);
              
            candidatesFixed++;
          }
        }
      }
    }

    console.log('\n=== RÉSUMÉ ===');
    console.log(`✅ ${clientsFixed} client(s) corrigé(s)`);
    console.log(`✅ ${candidatesFixed} candidat(s) corrigé(s)`);
    
    // Vérifier le client spécifique
    console.log('\n=== VÉRIFICATION CLIENT fmeleard+clienr_1119@gmail.com ===');
    
    const { data: specificClient } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('email', 'fmeleard+clienr_1119@gmail.com')
      .single();
      
    if (specificClient) {
      console.log('✅ Client maintenant disponible:');
      console.log('   - ID:', specificClient.id);
      console.log('   - Email:', specificClient.email);
      console.log('   - Company:', specificClient.company_name);
    } else {
      console.log('❌ Client toujours manquant');
    }
    
  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

fixMissingClientProfiles();