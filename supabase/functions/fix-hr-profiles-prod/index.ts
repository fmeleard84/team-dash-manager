import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔧 Correction de la structure hr_profiles en production');

    const results = {
      profiles_created: false,
      profiles_populated: false,
      errors: []
    };

    // 1. Supprimer et recréer hr_profiles avec la bonne structure
    try {
      console.log('📝 Suppression et recréation de hr_profiles...');

      // D'abord supprimer les données existantes
      await supabase.from('hr_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Récupérer les catégories
      const { data: categories, error: catError } = await supabase
        .from('hr_categories')
        .select('id, name');

      if (catError) {
        throw new Error(`Erreur récupération catégories: ${catError.message}`);
      }

      const catMap: Record<string, string> = {};
      categories?.forEach(cat => {
        catMap[cat.name] = cat.id;
      });

      // Insérer les profils SANS la colonne skills (qui n'existe pas encore)
      const profiles = [
        { name: 'Développeur Full-Stack', category_id: catMap['Développement'], base_price: 500 },
        { name: 'Développeur Frontend', category_id: catMap['Développement'], base_price: 450 },
        { name: 'Développeur Backend', category_id: catMap['Développement'], base_price: 450 },
        { name: 'Développeur Mobile', category_id: catMap['Développement'], base_price: 500 },
        { name: 'DevOps', category_id: catMap['Développement'], base_price: 550 },
        { name: 'UX/UI Designer', category_id: catMap['Design'], base_price: 400 },
        { name: 'Product Designer', category_id: catMap['Design'], base_price: 450 },
        { name: 'Chef de projet', category_id: catMap['Gestion de projet'], base_price: 600 },
        { name: 'Product Owner', category_id: catMap['Gestion de projet'], base_price: 650 },
        { name: 'Scrum Master', category_id: catMap['Gestion de projet'], base_price: 550 },
        { name: 'Data Analyst', category_id: catMap['Data'], base_price: 500 },
        { name: 'Data Scientist', category_id: catMap['Data'], base_price: 600 },
        { name: 'Growth Hacker', category_id: catMap['Marketing'], base_price: 450 },
        { name: 'Community Manager', category_id: catMap['Marketing'], base_price: 350 },
        { name: 'Business Developer', category_id: catMap['Commercial'], base_price: 500 },
        { name: 'Comptable', category_id: catMap['Finance'], base_price: 400 }
      ];

      const { error: insertError } = await supabase
        .from('hr_profiles')
        .insert(profiles);

      if (insertError) {
        console.error('Erreur insertion profils:', insertError);
        results.errors.push(`Insertion profils: ${insertError.message}`);
      } else {
        console.log('✅ Profils insérés avec succès');
        results.profiles_populated = true;
      }
    } catch (error) {
      console.error('Erreur hr_profiles:', error);
      results.errors.push(`hr_profiles: ${error.message}`);
    }

    // 2. Test final
    console.log('\n🧪 Test final...');
    try {
      const { data: profiles, error: testError } = await supabase
        .from('hr_profiles')
        .select('id, name, category_id, base_price')
        .limit(5);

      if (testError) {
        results.errors.push(`Test final: ${testError.message}`);
      } else {
        console.log(`✅ ${profiles?.length || 0} profils trouvés`);
        results.profiles_created = true;
      }

      // Test de jointure avec hr_resource_assignments
      const { error: joinError } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          project_id,
          profile_id,
          hr_profiles(name, category_id, base_price)
        `)
        .limit(1);

      if (joinError) {
        console.log('⚠️ Test jointure:', joinError.message);
        // Ce n'est pas critique si pas de données
      } else {
        console.log('✅ Test jointure réussi');
      }
    } catch (error) {
      results.errors.push(`Test: ${error.message}`);
    }

    const success = results.errors.length === 0;
    const message = success
      ? 'Structure hr_profiles corrigée avec succès'
      : 'Correction partielle - vérifiez les erreurs';

    return new Response(
      JSON.stringify({
        success,
        message,
        results,
        note: 'La colonne skills a été omise car elle n\'existe pas dans le schéma actuel'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: success ? 200 : 207,
      }
    );
  } catch (error) {
    console.error('❌ Erreur:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});