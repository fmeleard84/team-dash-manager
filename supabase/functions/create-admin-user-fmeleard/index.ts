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
    // Créer un client Supabase avec la clé service pour avoir les privilèges admin
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

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === 'fmeleard@gmail.com');

    if (userExists) {
      console.log('L\'utilisateur admin existe déjà');
      
      // Récupérer l'ID de l'utilisateur existant
      const existingUserId = existingUser?.users?.find(u => u.email === 'fmeleard@gmail.com')?.id;
      
      if (existingUserId) {
        // Vérifier si le profil admin existe
        const { data: adminProfile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', existingUserId)
          .single();

        if (adminProfile?.role !== 'admin') {
          // Mettre à jour le rôle en admin
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', existingUserId);

          if (updateError) {
            console.error('Erreur lors de la mise à jour du rôle:', updateError);
            throw updateError;
          }

          console.log('Rôle mis à jour en admin avec succès');
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Utilisateur admin déjà existant et rôle vérifié',
          userId: existingUserId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Créer le nouvel utilisateur admin
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'fmeleard@gmail.com',
      password: 'R@ymonde7510',
      email_confirm: true
    });

    if (authError) {
      console.error('Erreur création utilisateur:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Utilisateur non créé');
    }

    console.log('Utilisateur créé avec succès:', authData.user.id);

    // Créer le profil admin
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: 'fmeleard@gmail.com',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      // Si le profil existe déjà, le mettre à jour
      if (profileError.code === '23505') {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            role: 'admin',
            updated_at: new Date().toISOString()
          })
          .eq('id', authData.user.id);

        if (updateError) {
          console.error('Erreur mise à jour profil:', updateError);
          throw updateError;
        }
      } else {
        console.error('Erreur création profil:', profileError);
        throw profileError;
      }
    }

    console.log('Profil admin créé/mis à jour avec succès');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Utilisateur admin créé avec succès',
        userId: authData.user.id,
        email: 'fmeleard@gmail.com'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur générale:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erreur inconnue'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});