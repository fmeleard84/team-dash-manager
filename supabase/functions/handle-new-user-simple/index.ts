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
    // Log pour debug
    console.log('Request received');
    console.log('Headers:', req.headers);
    
    // Accepter TOUTE requête (pas de vérification d'auth pour le webhook)
    // Car le webhook vient de Supabase lui-même
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les données
    const payload = await req.json();
    console.log('Payload received:', JSON.stringify(payload));
    
    const record = payload.record || payload;
    
    if (!record || !record.id) {
      console.error('No valid record in payload');
      return new Response(
        JSON.stringify({ error: 'No valid record provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing user: ${record.id} - ${record.email}`);
    
    // Déterminer le rôle
    const userRole = record.raw_user_meta_data?.role || 'candidate';
    console.log(`User role: ${userRole}`);

    // Créer le profil général
    console.log('Creating general profile...');
    const profileData = {
      id: record.id,
      email: record.email,
      role: userRole,
      first_name: record.raw_user_meta_data?.first_name || record.raw_user_meta_data?.firstName || '',
      last_name: record.raw_user_meta_data?.last_name || record.raw_user_meta_data?.lastName || '',
      phone: record.raw_user_meta_data?.phone || '',
      company_name: record.raw_user_meta_data?.company_name || null
    };
    
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to create profile', details: profileError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log('Profile created successfully');

    // Si candidat, créer le profil candidat
    if (userRole === 'candidate') {
      console.log('Creating candidate profile...');
      const candidateData = {
        id: record.id,
        email: record.email || '',
        first_name: record.raw_user_meta_data?.first_name || record.raw_user_meta_data?.firstName || '',
        last_name: record.raw_user_meta_data?.last_name || record.raw_user_meta_data?.lastName || '',
        phone: record.raw_user_meta_data?.phone || '',
        status: 'disponible',
        qualification_status: 'pending',
        seniority: 'junior',
        profile_id: null,
        daily_rate: 0,
        password_hash: '',
        is_email_verified: record.email_confirmed_at !== null
      };
      
      const { error: candidateError } = await supabase
        .from('candidate_profiles')
        .upsert(candidateData, { onConflict: 'id' });

      if (candidateError) {
        console.error('Error creating candidate profile:', candidateError);
        return new Response(
          JSON.stringify({ error: 'Failed to create candidate profile', details: candidateError }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      console.log('Candidate profile created successfully');
    }

    // Si client, créer le profil client
    if (userRole === 'client') {
      console.log('Creating client profile...');
      const clientData = {
        id: record.id,
        company_name: record.raw_user_meta_data?.company_name || '',
        email: record.email || '',
        phone: record.raw_user_meta_data?.phone || '',
        first_name: record.raw_user_meta_data?.first_name || record.raw_user_meta_data?.firstName || '',
        last_name: record.raw_user_meta_data?.last_name || record.raw_user_meta_data?.lastName || ''
      };
      
      const { error: clientError } = await supabase
        .from('client_profiles')
        .upsert(clientData, { onConflict: 'id' });

      if (clientError) {
        console.error('Error creating client profile:', clientError);
        return new Response(
          JSON.stringify({ error: 'Failed to create client profile', details: clientError }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      console.log('Client profile created successfully');
    }

    // Succès
    return new Response(
      JSON.stringify({
        success: true,
        message: `Profiles created for ${record.email}`,
        userId: record.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});