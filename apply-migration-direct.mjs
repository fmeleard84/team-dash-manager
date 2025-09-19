#!/usr/bin/env node

import pkg from 'pg';
const { Client } = pkg;

// Configuration de la connexion
const connectionString = 'postgresql://postgres.egdelmcijszuapcpglsy:R@ymonde7510_2a@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function applyMigration() {
  const client = new Client({ connectionString });

  try {
    console.log('🚀 Connexion à la base de données...');
    await client.connect();

    console.log('✅ Connecté avec succès\n');

    // 1. Ajouter la colonne prompt_id
    try {
      await client.query(`
        ALTER TABLE public.hr_profiles
        ADD COLUMN IF NOT EXISTS prompt_id UUID REFERENCES public.prompts_ia(id) ON DELETE SET NULL;
      `);
      console.log('✅ Colonne prompt_id ajoutée');
    } catch (e) {
      console.log('ℹ️ Colonne prompt_id existe probablement déjà');
    }

    // 2. Créer la table ia_resource_prompts
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.ia_resource_prompts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          profile_id UUID NOT NULL REFERENCES public.hr_profiles(id) ON DELETE CASCADE,
          prompt_id UUID NOT NULL REFERENCES public.prompts_ia(id) ON DELETE CASCADE,
          is_primary BOOLEAN DEFAULT true,
          context VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(profile_id, prompt_id)
        );
      `);
      console.log('✅ Table ia_resource_prompts créée');
    } catch (e) {
      console.log('ℹ️ Table ia_resource_prompts existe probablement déjà');
    }

    // 3. Activer RLS
    try {
      await client.query('ALTER TABLE public.ia_resource_prompts ENABLE ROW LEVEL SECURITY;');
      console.log('✅ RLS activé');
    } catch (e) {
      console.log('ℹ️ RLS déjà activé');
    }

    // 4. Créer les politiques RLS
    const policies = [
      `CREATE POLICY IF NOT EXISTS "ia_resource_prompts_select"
       ON public.ia_resource_prompts FOR SELECT USING (true);`,

      `CREATE POLICY IF NOT EXISTS "ia_resource_prompts_admin_insert"
       ON public.ia_resource_prompts FOR INSERT
       WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));`,

      `CREATE POLICY IF NOT EXISTS "ia_resource_prompts_admin_update"
       ON public.ia_resource_prompts FOR UPDATE
       USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));`,

      `CREATE POLICY IF NOT EXISTS "ia_resource_prompts_admin_delete"
       ON public.ia_resource_prompts FOR DELETE
       USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));`
    ];

    for (const policy of policies) {
      try {
        await client.query(policy);
      } catch (e) {
        // Policy existe déjà
      }
    }
    console.log('✅ Politiques RLS créées');

    // 5. Créer les index
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_ia_prompts_profile ON public.ia_resource_prompts(profile_id);',
      'CREATE INDEX IF NOT EXISTS idx_ia_prompts_prompt ON public.ia_resource_prompts(prompt_id);',
      'CREATE INDEX IF NOT EXISTS idx_hr_profiles_prompt ON public.hr_profiles(prompt_id);'
    ];

    for (const index of indexes) {
      try {
        await client.query(index);
      } catch (e) {
        // Index existe déjà
      }
    }
    console.log('✅ Index créés');

    // 6. Insérer les prompts IA de base
    const prompts = [
      ['IA Rédacteur', 'ia_writer', 'Tu es un rédacteur IA spécialisé dans la création de contenu professionnel. Tu produis des documents structurés, clairs et adaptés au contexte du projet.'],
      ['IA Chef de Projet', 'ia_project_manager', 'Tu es un chef de projet IA qui aide à organiser, planifier et suivre les projets. Tu crées des plannings et rapports d\'avancement.'],
      ['IA Développeur', 'ia_developer', 'Tu es un développeur IA qui aide à concevoir des architectures techniques et écrire de la documentation technique.'],
      ['IA Designer', 'ia_designer', 'Tu es un designer IA qui aide à créer des concepts visuels et des guidelines UX/UI.'],
      ['IA Analyste', 'ia_analyst', 'Tu es un analyste IA qui aide à analyser des données et créer des rapports.']
    ];

    let promptsInserted = 0;
    for (const [name, context, prompt] of prompts) {
      try {
        await client.query(`
          INSERT INTO public.prompts_ia (name, context, prompt, active, priority)
          VALUES ($1, $2, $3, true, 100)
          ON CONFLICT (name) DO NOTHING;
        `, [name, context, prompt]);
        promptsInserted++;
      } catch (e) {
        console.log(`Prompt ${name} existe déjà ou erreur:`, e.message);
      }
    }
    console.log(`✅ ${promptsInserted} prompts IA insérés`);

    // 7. Vérification finale
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'hr_profiles'
      AND column_name = 'prompt_id';
    `);

    const tableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'ia_resource_prompts';
    `);

    const promptsCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM public.prompts_ia
      WHERE context IN ('ia_writer', 'ia_project_manager', 'ia_developer', 'ia_designer', 'ia_analyst');
    `);

    console.log('\n📊 Vérification finale:');
    console.log(`   - Colonne prompt_id: ${columnCheck.rows.length > 0 ? '✅' : '❌'}`);
    console.log(`   - Table ia_resource_prompts: ${tableCheck.rows.length > 0 ? '✅' : '❌'}`);
    console.log(`   - Prompts IA: ${promptsCheck.rows[0].count}/5`);

    console.log('\n🎉 Migration IA Team appliquée avec succès !');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

// Exécuter la migration
applyMigration();