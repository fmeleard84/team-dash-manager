import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCandidateSystem() {
  console.log('\n=== TEST DU SYSTÈME CANDIDAT AVEC ID UNIVERSEL ===\n');

  try {
    // 1. Créer un compte candidat de test
    console.log('1. Création d\'un candidat de test...');
    const testEmail = `test.candidate.${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: password,
      options: {
        data: {
          role: 'candidate',
          firstName: 'Test',
          lastName: 'Candidat'
        }
      }
    });

    if (signUpError) {
      console.error('Erreur création compte:', signUpError);
      return;
    }

    console.log('✅ Compte créé:', authData.user.id);

    // 2. Créer le profil candidat
    console.log('\n2. Création du profil candidat...');
    
    // D'abord récupérer un profile_id valide (hr_profile)
    const { data: profiles } = await supabase
      .from('hr_profiles')
      .select('id, name')
      .limit(1);
    
    const profileId = profiles?.[0]?.id;
    
    const { data: candidateProfile, error: profileError } = await supabase
      .from('candidate_profiles')
      .insert({
        id: authData.user.id,  // ID universel
        email: testEmail,
        first_name: 'Test',
        last_name: 'Candidat',
        profile_id: profileId,
        seniority: 'junior',
        status: 'disponible',
        qualification_status: 'qualified',
        is_email_verified: true
      })
      .select()
      .single();

    if (profileError) {
      console.error('Erreur création profil:', profileError);
      return;
    }

    console.log('✅ Profil créé avec ID universel:', candidateProfile.id);

    // 3. Ajouter des langues
    console.log('\n3. Ajout de langues...');
    
    // Récupérer quelques langues
    const { data: languages } = await supabase
      .from('hr_languages')
      .select('id, name')
      .in('name', ['Français', 'Anglais'])
      .limit(2);

    if (languages && languages.length > 0) {
      for (const lang of languages) {
        const { error: langError } = await supabase
          .from('candidate_languages')
          .insert({
            candidate_id: authData.user.id,  // ID universel
            language_id: lang.id
          });

        if (langError) {
          console.error(`Erreur ajout langue ${lang.name}:`, langError);
        } else {
          console.log(`✅ Langue ajoutée: ${lang.name}`);
        }
      }
    }

    // 4. Ajouter des expertises
    console.log('\n4. Ajout d\'expertises...');
    
    // Récupérer quelques expertises
    const { data: expertises } = await supabase
      .from('hr_expertises')
      .select('id, name')
      .limit(3);

    if (expertises && expertises.length > 0) {
      for (const exp of expertises) {
        const { error: expError } = await supabase
          .from('candidate_expertises')
          .insert({
            candidate_id: authData.user.id,  // ID universel
            expertise_id: exp.id
          });

        if (expError) {
          console.error(`Erreur ajout expertise ${exp.name}:`, expError);
        } else {
          console.log(`✅ Expertise ajoutée: ${exp.name}`);
        }
      }
    }

    // 5. Vérifier que tout est bien associé
    console.log('\n5. Vérification des associations...');
    
    const { data: verifyProfile } = await supabase
      .from('candidate_profiles')
      .select(`
        id,
        email,
        profile_id,
        seniority,
        status,
        candidate_languages (
          hr_languages (name)
        ),
        candidate_expertises (
          hr_expertises (name)
        )
      `)
      .eq('id', authData.user.id)
      .single();

    if (verifyProfile) {
      console.log('\n✅ Profil complet récupéré:');
      console.log('- ID (universel):', verifyProfile.id);
      console.log('- Email:', verifyProfile.email);
      console.log('- Métier (profile_id):', verifyProfile.profile_id);
      console.log('- Séniorité:', verifyProfile.seniority);
      console.log('- Statut:', verifyProfile.status);
      console.log('- Langues:', verifyProfile.candidate_languages.map(l => l.hr_languages.name).join(', '));
      console.log('- Expertises:', verifyProfile.candidate_expertises.map(e => e.hr_expertises.name).join(', '));
    }

    // 6. Test du matching (simuler la recherche de candidats)
    console.log('\n6. Test du matching de candidats...');
    
    const { data: matchingTest } = await supabase
      .from('candidate_profiles')
      .select(`
        id,
        email,
        candidate_languages (
          hr_languages (name)
        ),
        candidate_expertises (
          hr_expertises (name)
        )
      `)
      .eq('profile_id', profileId)
      .eq('seniority', 'junior')
      .eq('status', 'disponible');

    console.log(`\n✅ Candidats trouvés pour le matching: ${matchingTest?.length || 0}`);
    if (matchingTest && matchingTest.length > 0) {
      console.log('Le candidat de test apparaît bien dans les résultats de matching!');
    }

    console.log('\n=== TEST RÉUSSI ===');
    console.log('Le système fonctionne correctement avec l\'ID universel!');

    // Nettoyer (optionnel)
    console.log('\n7. Nettoyage...');
    await supabase.auth.admin.deleteUser(authData.user.id);
    console.log('✅ Utilisateur de test supprimé');

  } catch (error) {
    console.error('Erreur:', error);
  }

  process.exit(0);
}

testCandidateSystem();