import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Diagnostic et correction des profils candidats manquants');

    const TARGET_USER_ID = '24d7b412-ace1-42ca-8332-a6c426f5c98a';

    // 1. Vérifier l'utilisateur cible directement depuis auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(TARGET_USER_ID);
    
    if (authError) {
      console.error('❌ Erreur récupération auth user:', authError);
      throw new Error(`Utilisateur ${TARGET_USER_ID} non trouvé dans auth.users`);
    }

    console.log('✅ Utilisateur auth trouvé:', authUser.user?.email);

    // 2. Vérifier s'il a un profil général
    const { data: generalProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', TARGET_USER_ID)
      .single();

    console.log('📋 Profil général:', profileError ? 'MANQUANT' : 'EXISTE');

    // 3. Vérifier s'il a un profil candidat
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', TARGET_USER_ID)
      .single();

    console.log('📋 Profil candidat:', candidateError ? 'MANQUANT' : 'EXISTE');

    // 4. Créer les profils manquants
    const results = [];
    const user = authUser.user!;
    const email = user.email!;
    const metadata = user.user_metadata || {};
    
    console.log(`🔧 Traitement de l'utilisateur: ${email} (${TARGET_USER_ID})`);

    // Déterminer le rôle
    const role = metadata.role || 'candidate';

    try {
      // Créer le profil général s'il n'existe pas
      if (profileError) {
        console.log('🔧 Création du profil général...');
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: TARGET_USER_ID,
            email: email,
            role: role,
            first_name: metadata.first_name || metadata.firstName || '',
            last_name: metadata.last_name || metadata.lastName || '',
            company_name: metadata.company_name || null,
            phone: metadata.phone || null
          });

        if (createProfileError) {
          console.error('❌ Erreur création profil général:', createProfileError);
        } else {
          console.log('✅ Profil général créé');
        }
      }

      // Créer le profil candidat s'il n'existe pas
      if (candidateError && role === 'candidate') {
        console.log('🔧 Création du profil candidat...');
        const { error: createCandidateError } = await supabase
          .from('candidate_profiles')
          .insert({
            id: TARGET_USER_ID, // ID universel (auth.uid)
            email: email,
            first_name: metadata.first_name || metadata.firstName || '',
            last_name: metadata.last_name || metadata.lastName || '',
            phone: metadata.phone || null,
            status: 'disponible',
            qualification_status: 'pending',
            seniority: 'junior',
            profile_id: null, // NULL pour forcer l'onboarding
            daily_rate: 0,
            password_hash: '',
            is_email_verified: user.email_confirmed_at != null
          });

        if (createCandidateError) {
          console.error('❌ Erreur création profil candidat:', createCandidateError);
          results.push({
            userId: TARGET_USER_ID,
            email,
            status: 'ERROR',
            error: createCandidateError.message
          });
        } else {
          console.log('✅ Profil candidat créé');
          results.push({
            userId: TARGET_USER_ID,
            email,
            status: 'CREATED'
          });
        }
      } else {
        results.push({
          userId: TARGET_USER_ID,
          email,
          status: candidateError ? 'ALREADY_EXISTS' : 'ALREADY_EXISTS'
        });
      }

    } catch (error) {
      console.error(`❌ Erreur pour ${email}:`, error);
      results.push({
        userId: TARGET_USER_ID,
        email,
        status: 'ERROR',
        error: error.message
      });
    }

    // 5. Vérification finale
    const { data: finalCheck, error: finalError } = await supabase
      .from('candidate_profiles')
      .select('id, email, status, qualification_status, created_at')
      .eq('id', TARGET_USER_ID)
      .single();

    console.log('🔍 Vérification finale:', finalError ? 'TOUJOURS MANQUANT' : 'PROFIL CRÉÉ');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Diagnostic et correction terminés',
        authUser: {
          id: user.id,
          email: user.email,
          metadata: metadata
        },
        profileExists: !profileError,
        candidateProfileExists: !candidateError,
        results: results,
        targetUserFixed: !finalError,
        finalCheck: finalCheck
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erreur globale:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});