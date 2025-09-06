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

    console.log('🗑️ Suppression de tous les candidats...');

    // 1. Supprimer les données dans l'ordre pour respecter les contraintes FK
    const tables = [
      'candidate_languages',
      'candidate_expertises', 
      'candidate_skills',
      'candidate_notifications',
      'candidate_project_assignments',
      'candidate_qualification_results',
      'candidate_reviews',
      'project_bookings',
      'hr_resource_assignments' // Reset les assignments
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) {
        console.log(`Note: Erreur suppression ${table}:`, error.message);
      } else {
        console.log(`✅ Table ${table} nettoyée`);
      }
    }

    // 2. Supprimer les profils candidats
    const { error: profilesError } = await supabase
      .from('candidate_profiles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (profilesError) {
      console.error('Erreur suppression candidate_profiles:', profilesError);
    } else {
      console.log('✅ candidate_profiles supprimés');
    }

    // 3. Supprimer les utilisateurs auth avec rôle candidat
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (!authError && authUsers) {
      const candidateUsers = authUsers.users.filter(user => 
        user.user_metadata?.role === 'candidate' || 
        user.email?.includes('candidate') ||
        user.email?.includes('ressource')
      );

      let deletedCount = 0;
      for (const user of candidateUsers) {
        // Supprimer aussi de la table profiles
        await supabase.from('profiles').delete().eq('id', user.id);
        
        // Supprimer l'utilisateur auth
        const { error } = await supabase.auth.admin.deleteUser(user.id);
        if (!error) {
          deletedCount++;
          console.log(`✅ Utilisateur supprimé: ${user.email}`);
        }
      }

      console.log(`✅ ${deletedCount} utilisateurs candidats supprimés`);
    }

    // 4. Reset les compteurs et séquences si nécessaire
    const resetQuery = `
      -- Reset les booking_status des ressources non assignées
      UPDATE hr_resource_assignments 
      SET 
        booking_status = 'recherche',
        candidate_id = NULL,
        booking_data = NULL
      WHERE booking_status IN ('accepted', 'declined');
    `;

    await supabase.rpc('exec_sql', { sql: resetQuery });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tous les candidats ont été supprimés',
        details: 'Base de données nettoyée et prête pour de nouveaux tests'
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
        details: 'Erreur lors de la suppression des candidats'
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