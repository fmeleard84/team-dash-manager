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

    console.log('🔍 Vérification et correction des colonnes manquantes');

    const report = {
      environment: supabaseUrl.includes('nlesrzepybeeghghjafc') ? 'PRODUCTION' : 'DEVELOPMENT',
      timestamp: new Date().toISOString(),
      checks: [],
      fixes: [],
      errors: []
    };

    // 1. Vérifier hr_resource_assignments.calculated_price
    console.log('\n📊 Vérification: hr_resource_assignments.calculated_price');

    try {
      const { data, error } = await supabase
        .from('hr_resource_assignments')
        .select('calculated_price')
        .limit(1);

      if (error) {
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.log('  ❌ Colonne calculated_price manquante, ajout en cours...');
          report.checks.push({
            table: 'hr_resource_assignments',
            column: 'calculated_price',
            status: 'MISSING'
          });

          // Essayer d'ajouter la colonne
          try {
            // Note: Nous ne pouvons pas exécuter directement ALTER TABLE via Supabase client
            // Nous devons documenter ce qui doit être fait
            report.fixes.push({
              table: 'hr_resource_assignments',
              column: 'calculated_price',
              action: 'ALTER TABLE hr_resource_assignments ADD COLUMN calculated_price DECIMAL(10,2)',
              status: 'NEEDS_MANUAL_EXECUTION'
            });
          } catch (alterError) {
            report.errors.push(`Impossible d'ajouter calculated_price: ${alterError.message}`);
          }
        } else {
          throw error;
        }
      } else {
        console.log('  ✅ Colonne calculated_price existe');
        report.checks.push({
          table: 'hr_resource_assignments',
          column: 'calculated_price',
          status: 'EXISTS'
        });
      }
    } catch (err) {
      report.errors.push(`Erreur vérification calculated_price: ${err.message}`);
    }

    // 2. Vérifier hr_profiles.skills
    console.log('\n📊 Vérification: hr_profiles.skills');

    try {
      const { data, error } = await supabase
        .from('hr_profiles')
        .select('skills')
        .limit(1);

      if (error) {
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.log('  ❌ Colonne skills manquante, ajout nécessaire');
          report.checks.push({
            table: 'hr_profiles',
            column: 'skills',
            status: 'MISSING'
          });

          report.fixes.push({
            table: 'hr_profiles',
            column: 'skills',
            action: "ALTER TABLE hr_profiles ADD COLUMN skills TEXT[] DEFAULT '{}'",
            status: 'NEEDS_MANUAL_EXECUTION'
          });
        } else {
          throw error;
        }
      } else {
        console.log('  ✅ Colonne skills existe');
        report.checks.push({
          table: 'hr_profiles',
          column: 'skills',
          status: 'EXISTS'
        });
      }
    } catch (err) {
      report.errors.push(`Erreur vérification skills: ${err.message}`);
    }

    // 3. Vérifier les autres colonnes importantes
    const otherChecks = [
      { table: 'candidate_profiles', columns: ['profile_id', 'seniority', 'status', 'qualification_status'] },
      { table: 'projects', columns: ['status', 'owner_id', 'client_budget'] }
    ];

    for (const check of otherChecks) {
      console.log(`\n📊 Vérification: ${check.table}`);

      for (const column of check.columns) {
        try {
          const { error } = await supabase
            .from(check.table)
            .select(column)
            .limit(1);

          if (error && error.message.includes('does not exist')) {
            console.log(`  ❌ Colonne ${column} manquante`);
            report.checks.push({
              table: check.table,
              column,
              status: 'MISSING'
            });
          } else if (error) {
            console.log(`  ⚠️ Erreur pour ${column}: ${error.message}`);
          } else {
            console.log(`  ✅ Colonne ${column} existe`);
            report.checks.push({
              table: check.table,
              column,
              status: 'EXISTS'
            });
          }
        } catch (err) {
          report.errors.push(`Erreur ${check.table}.${column}: ${err.message}`);
        }
      }
    }

    // 4. Test de requête complexe
    console.log('\n🧪 Test de requête complexe avec jointure');

    try {
      const { data, error } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          project_id,
          profile_id,
          booking_status,
          projects!inner(
            id,
            title,
            status
          )
        `)
        .limit(1);

      if (error) {
        console.log('  ❌ Jointure échouée:', error.message);
        report.errors.push(`Jointure échouée: ${error.message}`);
      } else {
        console.log('  ✅ Jointure fonctionne');
        report.checks.push({
          table: 'hr_resource_assignments',
          column: 'JOINTURE_PROJECTS',
          status: 'OK'
        });
      }
    } catch (err) {
      report.errors.push(`Test jointure: ${err.message}`);
    }

    // Générer le script SQL si nécessaire
    const missingColumns = report.checks.filter(c => c.status === 'MISSING');

    if (missingColumns.length > 0) {
      console.log('\n📝 Script SQL de correction nécessaire:');

      let sqlScript = `-- Script de correction pour ${report.environment}\n`;
      sqlScript += `-- Date: ${report.timestamp}\n\n`;

      for (const missing of missingColumns) {
        if (missing.table === 'hr_resource_assignments' && missing.column === 'calculated_price') {
          sqlScript += `-- Ajouter calculated_price\n`;
          sqlScript += `ALTER TABLE public.hr_resource_assignments\n`;
          sqlScript += `ADD COLUMN IF NOT EXISTS calculated_price DECIMAL(10,2);\n\n`;
        } else if (missing.table === 'hr_profiles' && missing.column === 'skills') {
          sqlScript += `-- Ajouter skills\n`;
          sqlScript += `ALTER TABLE public.hr_profiles\n`;
          sqlScript += `ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';\n\n`;
        }
      }

      report.sqlScript = sqlScript;
      console.log(sqlScript);
    }

    // Résumé
    const totalChecks = report.checks.length;
    const missingCount = report.checks.filter(c => c.status === 'MISSING').length;
    const existingCount = report.checks.filter(c => c.status === 'EXISTS').length;

    console.log('\n📊 RÉSUMÉ:');
    console.log(`  - Total vérifiés: ${totalChecks}`);
    console.log(`  - Colonnes existantes: ${existingCount}`);
    console.log(`  - Colonnes manquantes: ${missingCount}`);
    console.log(`  - Erreurs: ${report.errors.length}`);

    return new Response(
      JSON.stringify({
        success: missingCount === 0,
        report,
        message: missingCount > 0
          ? `${missingCount} colonnes manquantes détectées. Exécutez le script SQL fourni.`
          : 'Toutes les colonnes sont présentes!'
      }),
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