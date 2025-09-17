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

    // Utiliser le client admin pour avoir tous les droits
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🚀 Démarrage de la migration des tables HR en production');

    const migrations = [];
    const errors = [];

    // 1. Vérifier et créer hr_categories
    try {
      const { count: catCount } = await supabase
        .from('hr_categories')
        .select('*', { count: 'exact', head: true });

      if (catCount === 0 || catCount === null) {
        console.log('📝 Création de hr_categories...');

        // Insérer les catégories
        const { error: insertError } = await supabase
          .from('hr_categories')
          .insert([
            { name: 'Développement', description: 'Développeurs, architectes, DevOps' },
            { name: 'Design', description: 'UX/UI, graphistes, motion designers' },
            { name: 'Marketing', description: 'Marketing digital, growth, SEO/SEA' },
            { name: 'Gestion de projet', description: 'Chefs de projet, product owners, scrum masters' },
            { name: 'Data', description: 'Data scientists, data analysts, data engineers' },
            { name: 'Support', description: 'Support client, QA, testeurs' },
            { name: 'Commercial', description: 'Business developers, account managers' },
            { name: 'RH', description: 'Recruteurs, gestionnaires RH' },
            { name: 'Finance', description: 'Comptables, contrôleurs de gestion' },
            { name: 'Juridique', description: 'Juristes, avocats' }
          ]);

        if (insertError) {
          console.error('Erreur insertion catégories:', insertError);
          errors.push(`hr_categories: ${insertError.message}`);
        } else {
          migrations.push('hr_categories créée et peuplée');
          console.log('✅ hr_categories créée');
        }
      } else {
        console.log(`✅ hr_categories existe déjà (${catCount} entrées)`);
        migrations.push(`hr_categories existe (${catCount} entrées)`);
      }
    } catch (error) {
      console.error('Erreur hr_categories:', error);
      errors.push(`hr_categories: ${error.message}`);
    }

    // 2. Vérifier et créer hr_profiles
    try {
      const { count: profCount } = await supabase
        .from('hr_profiles')
        .select('*', { count: 'exact', head: true });

      if (profCount === 0 || profCount === null) {
        console.log('📝 Création de hr_profiles...');

        // Récupérer les IDs des catégories
        const { data: categories } = await supabase
          .from('hr_categories')
          .select('id, name');

        const catMap = {};
        categories?.forEach(cat => {
          catMap[cat.name] = cat.id;
        });

        // Insérer les profils
        const profiles = [
          { name: 'Développeur Full-Stack', category_id: catMap['Développement'], base_price: 500, skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'] },
          { name: 'Développeur Frontend', category_id: catMap['Développement'], base_price: 450, skills: ['React', 'Vue.js', 'TypeScript', 'CSS'] },
          { name: 'Développeur Backend', category_id: catMap['Développement'], base_price: 450, skills: ['Node.js', 'Python', 'API REST', 'PostgreSQL'] },
          { name: 'Développeur Mobile', category_id: catMap['Développement'], base_price: 500, skills: ['React Native', 'Flutter', 'iOS', 'Android'] },
          { name: 'DevOps', category_id: catMap['Développement'], base_price: 550, skills: ['Docker', 'Kubernetes', 'CI/CD', 'AWS'] },
          { name: 'UX/UI Designer', category_id: catMap['Design'], base_price: 400, skills: ['Figma', 'Sketch', 'Adobe XD', 'Prototypage'] },
          { name: 'Product Designer', category_id: catMap['Design'], base_price: 450, skills: ['Design Thinking', 'User Research', 'Prototypage'] },
          { name: 'Chef de projet', category_id: catMap['Gestion de projet'], base_price: 600, skills: ['Agile', 'Scrum', 'Jira', 'Planification'] },
          { name: 'Product Owner', category_id: catMap['Gestion de projet'], base_price: 650, skills: ['Agile', 'User Stories', 'Roadmap', 'Analytics'] },
          { name: 'Scrum Master', category_id: catMap['Gestion de projet'], base_price: 550, skills: ['Scrum', 'Agile', 'Facilitation', 'Coaching'] },
          { name: 'Data Analyst', category_id: catMap['Data'], base_price: 500, skills: ['SQL', 'Python', 'Tableau', 'Analytics'] },
          { name: 'Data Scientist', category_id: catMap['Data'], base_price: 600, skills: ['Python', 'Machine Learning', 'TensorFlow', 'Statistics'] },
          { name: 'Growth Hacker', category_id: catMap['Marketing'], base_price: 450, skills: ['SEO', 'SEA', 'Analytics', 'A/B Testing'] },
          { name: 'Community Manager', category_id: catMap['Marketing'], base_price: 350, skills: ['Social Media', 'Content', 'Engagement'] },
          { name: 'Business Developer', category_id: catMap['Commercial'], base_price: 500, skills: ['Négociation', 'CRM', 'Prospection'] },
          { name: 'Comptable', category_id: catMap['Finance'], base_price: 400, skills: ['Comptabilité', 'Excel', 'ERP'] }
        ];

        const { error: insertError } = await supabase
          .from('hr_profiles')
          .insert(profiles);

        if (insertError) {
          console.error('Erreur insertion profils:', insertError);
          errors.push(`hr_profiles: ${insertError.message}`);
        } else {
          migrations.push('hr_profiles créée et peuplée');
          console.log('✅ hr_profiles créée');
        }
      } else {
        console.log(`✅ hr_profiles existe déjà (${profCount} entrées)`);
        migrations.push(`hr_profiles existe (${profCount} entrées)`);
      }
    } catch (error) {
      console.error('Erreur hr_profiles:', error);
      errors.push(`hr_profiles: ${error.message}`);
    }

    // 3. Vérifier hr_resource_assignments
    try {
      const { count: assignCount, error: countError } = await supabase
        .from('hr_resource_assignments')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.log('⚠️ Table hr_resource_assignments peut ne pas exister:', countError.message);
        errors.push(`hr_resource_assignments: ${countError.message} - Table peut nécessiter une création manuelle via SQL`);
      } else {
        console.log(`✅ hr_resource_assignments existe (${assignCount} entrées)`);
        migrations.push(`hr_resource_assignments existe (${assignCount} entrées)`);
      }
    } catch (error) {
      console.error('Erreur hr_resource_assignments:', error);
      errors.push(`hr_resource_assignments: ${error.message}`);
    }

    // 4. Test final de requête
    console.log('\n🧪 Test de requête complète...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          project_id,
          profile_id,
          candidate_id,
          booking_status,
          projects!inner(id, title),
          hr_profiles(name, category_id)
        `)
        .limit(1);

      if (testError) {
        console.log('⚠️ Test de jointure échoué:', testError.message);
        errors.push(`Test jointure: ${testError.message}`);
      } else {
        console.log('✅ Test de jointure réussi');
        migrations.push('Test de jointure réussi');
      }
    } catch (error) {
      console.error('Erreur test:', error);
      errors.push(`Test: ${error.message}`);
    }

    const success = errors.length === 0;
    const message = success
      ? 'Migration complétée avec succès'
      : 'Migration partielle - certaines erreurs détectées';

    console.log('\n📊 Résumé de la migration:');
    console.log('Succès:', migrations);
    console.log('Erreurs:', errors);

    return new Response(
      JSON.stringify({
        success,
        message,
        migrations,
        errors,
        recommendation: errors.length > 0
          ? 'Exécutez la migration SQL directement via le dashboard Supabase si nécessaire'
          : 'Tables HR configurées correctement'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: success ? 200 : 207,
      }
    );
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Erreur critique - voir les logs'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});