import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Exécuter la requête SQL pour ajouter la colonne
    const { data, error } = await supabase.rpc('query', {
      query: `
        ALTER TABLE public.client_profiles 
        ADD COLUMN IF NOT EXISTS siret VARCHAR(14);
      `
    });
    
    if (error) {
      // Si l'erreur est que la fonction query n'existe pas, on essaie autrement
      console.log('Trying alternative method...');
      
      // Vérifier si la colonne existe déjà en essayant de la lire
      const { error: testError } = await supabase
        .from('client_profiles')
        .select('siret')
        .limit(1);
      
      if (testError && testError.message.includes("column")) {
        // La colonne n'existe pas, on ne peut pas l'ajouter directement
        // On retourne un message pour indiquer qu'il faut l'ajouter manuellement
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Please add the siret column manually via Supabase dashboard',
            sql: 'ALTER TABLE public.client_profiles ADD COLUMN siret VARCHAR(14);'
          }),
          { 
            headers: { 'Content-Type': 'application/json' }
          }
        );
      } else {
        // La colonne existe déjà
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Column siret already exists'
          }),
          { 
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SIRET column added successfully'
      }),
      { 
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});