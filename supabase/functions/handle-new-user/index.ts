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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les données du webhook
    const payload = await req.json();
    console.log('Webhook payload received:', JSON.stringify(payload));
    
    // Le webhook Supabase envoie les données dans payload.record
    const record = payload.record || payload;
    
    if (!record || !record.id) {
      throw new Error('No valid record provided');
    }

    console.log(`Processing new user: ${record.email}`);

    // Déterminer le rôle
    const userRole = record.raw_user_meta_data?.role || 'candidate';

    // Créer le profil général
    console.log('Creating general profile for user:', record.id);
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: record.id,
        email: record.email,
        role: userRole,
        first_name: record.raw_user_meta_data?.first_name || record.raw_user_meta_data?.firstName || '',
        last_name: record.raw_user_meta_data?.last_name || record.raw_user_meta_data?.lastName || '',
        phone: record.raw_user_meta_data?.phone || '',
        company_name: record.raw_user_meta_data?.company_name || null
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      throw profileError;
    } else {
      console.log('Profile created successfully');
    }

    // Si c'est un candidat, créer le profil candidat
    if (userRole === 'candidate') {
      console.log('Creating candidate profile for user:', record.id);
      const { error: candidateError } = await supabase
        .from('candidate_profiles')
        .upsert({
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
        }, {
          onConflict: 'id'
        });

      if (candidateError) {
        console.error('Error creating candidate profile:', candidateError);
        throw candidateError;
      } else {
        console.log('Candidate profile created successfully');
      }
    }
    
    // Si c'est un client, créer le profil client
    else if (userRole === 'client') {
      const { error: clientError } = await supabase
        .from('client_profiles')
        .upsert({
          id: record.id,
          email: record.email || '',
          first_name: record.raw_user_meta_data?.first_name || record.raw_user_meta_data?.firstName || '',
          last_name: record.raw_user_meta_data?.last_name || record.raw_user_meta_data?.lastName || '',
          company_name: record.raw_user_meta_data?.company_name || '',
          phone: record.raw_user_meta_data?.phone || '',
          user_id: record.id
        }, {
          onConflict: 'id'
        });

      if (clientError) {
        console.error('Error creating client profile:', clientError);
      } else {
        console.log('Client profile created successfully');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Profile created for ${record.email}`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 400 
      }
    );
  }
});