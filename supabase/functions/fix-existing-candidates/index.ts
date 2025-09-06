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

    console.log('🔧 Correction des candidats existants...');

    // 1. Récupérer tous les utilisateurs candidats depuis auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw authError;
    }

    const candidateUsers = authUsers.users.filter(user => 
      user.user_metadata?.role === 'candidate' || 
      user.email?.includes('ressource')
    );

    console.log(`📊 ${candidateUsers.length} candidats trouvés dans auth.users`);

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const user of candidateUsers) {
      try {
        // Vérifier si le profil existe avec l'ID universel
        const { data: existingProfile } = await supabase
          .from('candidate_profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!existingProfile) {
          // Créer le profil candidat avec l'ID universel
          const { error: insertError } = await supabase
            .from('candidate_profiles')
            .insert({
              id: user.id, // ID universel
              email: user.email,
              first_name: user.user_metadata?.first_name || user.user_metadata?.firstName || '',
              last_name: user.user_metadata?.last_name || user.user_metadata?.lastName || '',
              phone: user.user_metadata?.phone || '',
              status: 'qualification',
              qualification_status: 'pending',
              seniority: 'junior',
              daily_rate: 0,
              password_hash: '',
              is_email_verified: user.email_confirmed_at !== null
            });

          if (insertError) {
            console.error(`❌ Erreur création profil pour ${user.email}:`, insertError);
            errors++;
          } else {
            console.log(`✅ Profil créé pour ${user.email}`);
            created++;
          }
        } else {
          console.log(`ℹ️ Profil existe déjà pour ${user.email}`);
          updated++;
        }

        // Créer aussi dans profiles si n'existe pas
        await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            role: 'candidate',
            first_name: user.user_metadata?.first_name || user.user_metadata?.firstName || '',
            last_name: user.user_metadata?.last_name || user.user_metadata?.lastName || '',
            phone: user.user_metadata?.phone || ''
          })
          .select()
          .single();
        // Ignorer l'erreur si existe déjà

      } catch (error) {
        console.error(`Erreur pour l'utilisateur ${user.email}:`, error);
        errors++;
      }
    }

    // 2. Nettoyer les anciens profils qui utilisent user_id
    const cleanupQuery = `
      -- Supprimer les profils avec user_id qui ne correspondent pas à l'ID
      DELETE FROM candidate_profiles 
      WHERE user_id IS NOT NULL 
      AND user_id != id::text;
    `;

    await supabase.rpc('exec_sql', { sql: cleanupQuery });

    console.log('✅ Nettoyage des anciens profils terminé');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Candidats existants corrigés',
        stats: {
          total: candidateUsers.length,
          created,
          existing: updated,
          errors
        }
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
        details: 'Erreur lors de la correction des candidats existants'
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