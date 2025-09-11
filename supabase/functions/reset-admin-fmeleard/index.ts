import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Chercher l'utilisateur
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    let userId = users?.users?.find(u => u.email === 'fmeleard@gmail.com')?.id;

    if (!userId) {
      // Créer l'utilisateur s'il n'existe pas
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'fmeleard@gmail.com',
        password: 'R@ymonde7510',
        email_confirm: true
      });

      if (createError) throw createError;
      userId = newUser.user?.id;
      
      console.log('Nouvel utilisateur créé:', userId);
    } else {
      // Réinitialiser le mot de passe
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { 
          password: 'R@ymonde7510',
          email_confirm: true
        }
      );

      if (updateError) throw updateError;
      console.log('Mot de passe réinitialisé pour:', userId);
    }

    // Assurer que le profil admin existe
    if (userId) {
      // D'abord, essayer de récupérer le profil
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!existingProfile) {
        // Créer le profil s'il n'existe pas
        const { error: insertError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            email: 'fmeleard@gmail.com',
            role: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError && insertError.code !== '23505') {
          console.error('Erreur création profil:', insertError);
        } else {
          console.log('Profil admin créé');
        }
      } else {
        // Mettre à jour le rôle si nécessaire
        if (existingProfile.role !== 'admin') {
          const { error: updateRoleError } = await supabaseAdmin
            .from('profiles')
            .update({ 
              role: 'admin',
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (updateRoleError) {
            console.error('Erreur mise à jour rôle:', updateRoleError);
          } else {
            console.log('Rôle mis à jour en admin');
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Utilisateur admin configuré avec succès',
        userId: userId,
        credentials: {
          email: 'fmeleard@gmail.com',
          password: 'R@ymonde7510',
          role: 'admin'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});