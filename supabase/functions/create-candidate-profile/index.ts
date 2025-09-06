import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateId } = await req.json();
    
    if (!candidateId) {
      throw new Error('candidateId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`🔧 Création du profil pour le candidat ${candidateId}...`);

    // 1. Récupérer les infos de l'utilisateur depuis auth.users
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(candidateId);
    
    if (userError || !user) {
      console.error('Utilisateur non trouvé dans auth.users');
      throw new Error(`Utilisateur non trouvé: ${userError?.message || 'Unknown error'}`);
    }

    console.log('Utilisateur trouvé:', user.email);
    console.log('Metadata:', user.user_metadata);

    // 2. Vérifier si le profil existe déjà
    const { data: existingProfile } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', candidateId)
      .maybeSingle();

    if (existingProfile) {
      console.log('Le profil existe déjà');
      const needsOnboarding = !existingProfile.profile_id || !existingProfile.seniority;
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Le profil existe déjà',
          profile: existingProfile,
          needsOnboarding
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // 3. Créer le profil candidat avec l'ID universel
    console.log('Création du profil candidat...');
    
    const profileData = {
      id: candidateId, // ID universel
      email: user.email || '',
      first_name: user.user_metadata?.first_name || user.user_metadata?.firstName || '',
      last_name: user.user_metadata?.last_name || user.user_metadata?.lastName || '',
      phone: user.user_metadata?.phone || '',
      status: 'disponible', // Statut initial disponible
      qualification_status: 'pending',
      seniority: 'junior', // Valeur par défaut, sera changée dans l'onboarding
      profile_id: null, // NULL pour forcer l'onboarding
      daily_rate: 0,
      password_hash: '',
      is_email_verified: user.email_confirmed_at !== null
    };

    const { data: newProfile, error: insertError } = await supabase
      .from('candidate_profiles')
      .insert(profileData)
      .select()
      .single();

    if (insertError) {
      console.error('Erreur création profil candidat:', insertError);
      throw insertError;
    }

    console.log('✅ Profil candidat créé avec succès');

    // 4. Créer aussi dans la table profiles si nécessaire
    const { error: profilesError } = await supabase
      .from('profiles')
      .insert({
        id: candidateId,
        email: user.email || '',
        role: 'candidate',
        first_name: user.user_metadata?.first_name || user.user_metadata?.firstName || '',
        last_name: user.user_metadata?.last_name || user.user_metadata?.lastName || '',
        phone: user.user_metadata?.phone || ''
      });
    
    if (profilesError && profilesError.code !== '23505') { // Ignorer si existe déjà
      console.log('Note: Profil général déjà existant ou erreur:', profilesError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Profil créé avec succès - L\'onboarding va se déclencher',
        profile: newProfile,
        needsOnboarding: true
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Erreur lors de la création du profil candidat'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    );
  }
});