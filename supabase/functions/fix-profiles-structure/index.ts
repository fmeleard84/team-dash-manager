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

    console.log('=== CORRECTION DES PROFILS MANQUANTS ===');
    
    // 1. Récupérer tous les profils
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (profilesError) {
      throw profilesError;
    }
    
    console.log(`📊 ${profiles.length} profils trouvés`);
    
    let clientsFixed = 0;
    let candidatesFixed = 0;
    const errors: string[] = [];
    
    for (const profile of profiles) {
      // Déterminer le type basé sur l'email
      const isClient = profile.email.includes('client') || profile.email.includes('clienr');
      
      if (isClient) {
        // Vérifier si le profil client existe
        const { data: existingClient } = await supabase
          .from('client_profiles')
          .select('id')
          .eq('id', profile.id)
          .single();
          
        if (!existingClient) {
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
            errors.push(`Client ${profile.email}: ${createError.message}`);
          } else {
            console.log(`✅ Client profile créé pour: ${profile.email}`);
            
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
        const { data: existingCandidate } = await supabase
          .from('candidate_profiles')
          .select('id')
          .eq('id', profile.id)
          .single();
          
        if (!existingCandidate) {
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
            errors.push(`Candidate ${profile.email}: ${createError.message}`);
          } else {
            console.log(`✅ Candidate profile créé pour: ${profile.email}`);
            
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
    
    // Vérifier le client spécifique
    const { data: specificClient } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('email', 'fmeleard+clienr_1119@gmail.com')
      .single();
    
    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          clientsFixed,
          candidatesFixed,
          totalProfiles: profiles.length,
          errors: errors.length > 0 ? errors : undefined,
          specificClient: specificClient ? {
            id: specificClient.id,
            email: specificClient.email,
            company: specificClient.company_name
          } : null
        }
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