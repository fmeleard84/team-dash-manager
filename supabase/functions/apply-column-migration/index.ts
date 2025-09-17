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

    console.log('🚀 Application de la migration des colonnes');

    const results = {
      environment: supabaseUrl.includes('nlesrzepybeeghghjafc') ? 'PRODUCTION' : 'DEVELOPMENT',
      timestamp: new Date().toISOString(),
      migrations: [],
      errors: []
    };

    // 1. Test initial - Vérifier l'état actuel
    console.log('\n📊 État initial des colonnes:');

    // Test calculated_price
    let hasCalculatedPrice = false;
    try {
      const { error } = await supabase
        .from('hr_resource_assignments')
        .select('calculated_price')
        .limit(1);

      hasCalculatedPrice = !error || !error.message.includes('does not exist');
      console.log(`  - calculated_price: ${hasCalculatedPrice ? '✅ Existe' : '❌ Manquante'}`);
    } catch (err) {
      console.log('  - calculated_price: ❌ Erreur de vérification');
    }

    // Test skills
    let hasSkills = false;
    try {
      const { error } = await supabase
        .from('hr_profiles')
        .select('skills')
        .limit(1);

      hasSkills = !error || !error.message.includes('does not exist');
      console.log(`  - skills: ${hasSkills ? '✅ Existe' : '❌ Manquante'}`);
    } catch (err) {
      console.log('  - skills: ❌ Erreur de vérification');
    }

    // 2. Si des colonnes manquent, informer l'utilisateur
    if (!hasCalculatedPrice || !hasSkills) {
      console.log('\n⚠️ Colonnes manquantes détectées');

      // Instructions pour appliquer la migration manuellement
      const migrationInstructions = `
-- ============================================
-- MIGRATION À EXÉCUTER DANS LE DASHBOARD SUPABASE
-- ============================================

-- 1. Ajouter calculated_price si elle n'existe pas
ALTER TABLE public.hr_resource_assignments
ADD COLUMN IF NOT EXISTS calculated_price DECIMAL(10,2);

-- 2. Ajouter skills si elle n'existe pas
ALTER TABLE public.hr_profiles
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

-- 3. Initialiser les skills pour les profils existants
UPDATE public.hr_profiles SET skills = CASE
  WHEN name = 'Développeur Full-Stack' THEN ARRAY['JavaScript', 'React', 'Node.js', 'PostgreSQL']
  WHEN name = 'Développeur Frontend' THEN ARRAY['React', 'Vue.js', 'TypeScript', 'CSS']
  WHEN name = 'Développeur Backend' THEN ARRAY['Node.js', 'Python', 'API REST', 'PostgreSQL']
  WHEN name = 'UX/UI Designer' THEN ARRAY['Figma', 'Sketch', 'Adobe XD']
  WHEN name = 'Chef de projet' THEN ARRAY['Agile', 'Scrum', 'Jira']
  WHEN name = 'Product Owner' THEN ARRAY['Agile', 'User Stories', 'Roadmap']
  ELSE '{}'::TEXT[]
END
WHERE skills = '{}' OR skills IS NULL;
`;

      results.migrations.push({
        status: 'PENDING',
        message: 'Migration SQL requise',
        instructions: migrationInstructions
      });

      console.log('\n📝 Instructions de migration:');
      console.log(migrationInstructions);
    } else {
      console.log('\n✅ Toutes les colonnes requises sont présentes');
      results.migrations.push({
        status: 'COMPLETED',
        message: 'Aucune migration nécessaire'
      });
    }

    // 3. Test final - Requête complexe
    console.log('\n🧪 Test de requête complexe:');
    try {
      const { data, error } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          project_id,
          profile_id,
          booking_status,
          seniority,
          languages,
          expertises,
          projects(
            id,
            title,
            status
          )
        `)
        .limit(1);

      if (error) {
        console.log(`  ❌ Échec: ${error.message}`);
        results.errors.push(`Requête complexe: ${error.message}`);
      } else {
        console.log('  ✅ Requête complexe fonctionne');
      }
    } catch (err) {
      results.errors.push(`Test final: ${err.message}`);
    }

    // 4. Recommandations
    const recommendations = [];

    if (!hasCalculatedPrice) {
      recommendations.push(
        '1. Ajouter la colonne calculated_price via le dashboard SQL',
        '2. OU retirer cette colonne des requêtes dans le code'
      );
    }

    if (!hasSkills) {
      recommendations.push(
        '1. Ajouter la colonne skills via le dashboard SQL',
        '2. OU adapter le code pour fonctionner sans cette colonne'
      );
    }

    // Résumé
    const summary = {
      success: hasCalculatedPrice && hasSkills,
      columnsStatus: {
        calculated_price: hasCalculatedPrice,
        skills: hasSkills
      },
      recommendations,
      results
    };

    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
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