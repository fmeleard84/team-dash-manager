import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

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

    console.log("🔧 Création de la vue project_bookings pour la compatibilité...");

    // Test si project_bookings existe déjà
    const { data: testData, error: testError } = await supabase
      .from('project_bookings')
      .select('id')
      .limit(1);

    if (!testError) {
      console.log("✅ project_bookings existe déjà (table ou vue)");
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "project_bookings existe déjà",
          type: "existing"
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log("⚠️ project_bookings n'existe pas, création de la vue...");

    // La vue n'existe pas, on doit la créer manuellement
    // Note: On ne peut pas exécuter de DDL directement via Supabase JS
    // La migration doit être appliquée via le Dashboard ou CLI

    const instructions = [
      "📝 INSTRUCTIONS POUR CRÉER LA VUE project_bookings:",
      "",
      "1. Aller dans le Dashboard Supabase",
      "2. Database → SQL Editor",
      "3. Exécuter cette requête SQL:",
      "",
      "-- Créer la vue project_bookings",
      "CREATE OR REPLACE VIEW project_bookings AS",
      "SELECT ",
      "    hra.id,",
      "    hra.project_id,",
      "    hra.candidate_id,",
      "    CASE ",
      "      WHEN hra.booking_status = 'accepted' THEN 'confirmed'",
      "      WHEN hra.booking_status = 'declined' THEN 'cancelled'",
      "      ELSE hra.booking_status",
      "    END as status,",
      "    hra.created_at,",
      "    hra.updated_at,",
      "    hra.id as resource_assignment_id",
      "FROM hr_resource_assignments hra",
      "WHERE hra.candidate_id IS NOT NULL;",
      "",
      "-- Donner les permissions",
      "GRANT SELECT ON project_bookings TO authenticated;",
      "",
      "4. Cela créera une vue qui mappe hr_resource_assignments vers l'ancienne structure"
    ];

    console.log(instructions.join("\n"));

    return new Response(
      JSON.stringify({ 
        success: false,
        message: "Vue project_bookings doit être créée manuellement",
        instructions: instructions.join("\n"),
        sql_file: "supabase/migrations/20250906_create_project_bookings_view.sql"
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Erreur:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});