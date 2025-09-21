import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    console.log('🧪 Test complet de l\'architecture IA pour la messagerie');

    const results = {
      triggerExists: false,
      iaCreated: false,
      profilesCreated: false,
      projectCreated: false,
      triggerWorking: false,
      messagingWorks: false,
      projectId: null,
      iaId: null
    };

    // 1. Créer une catégorie IA
    let { data: iaCategory } = await supabase
      .from('hr_categories')
      .select('*')
      .ilike('name', '%intelligence%')
      .single();

    if (!iaCategory) {
      const { data: newCategory, error: categoryError } = await supabase
        .from('hr_categories')
        .insert({ name: 'Intelligence Artificielle' })
        .select()
        .single();

      if (categoryError) throw categoryError;
      iaCategory = newCategory;
    }

    // 2. Créer une ressource IA
    const { data: iaProfile, error: iaError } = await supabase
      .from('hr_profiles')
      .upsert({
        name: 'IA Test Messagerie',
        category_id: iaCategory.id,
        base_price: 450,
        is_ai: true
      }, {
        onConflict: 'name'
      })
      .select()
      .single();

    if (iaError) throw iaError;
    results.iaCreated = true;
    results.iaId = iaProfile.id;

    console.log('✅ Ressource IA créée:', iaProfile.name);

    // 3. Créer les profils (user + candidat)
    await supabase
      .from('profiles')
      .upsert({
        id: iaProfile.id,
        email: 'ia_test_messagerie@ia.team',
        first_name: 'IA',
        role: 'candidate'
      }, {
        onConflict: 'id'
      });

    await supabase
      .from('candidate_profiles')
      .upsert({
        id: iaProfile.id,
        first_name: 'IA',
        last_name: 'Test Messagerie',
        email: 'ia_test_messagerie@ia.team',
        position: 'IA Test Messagerie',
        seniority: 'expert',
        status: 'disponible',
        profile_id: iaProfile.id,
        daily_rate: 450,
        is_email_verified: true
      }, {
        onConflict: 'id'
      });

    results.profilesCreated = true;
    console.log('✅ Profils IA créés');

    // 4. Trouver ou créer un client
    let { data: clients } = await supabase
      .from('client_profiles')
      .select('id')
      .limit(1);

    if (!clients || clients.length === 0) {
      // Créer un client de test
      const { data: testUser } = await supabase
        .from('profiles')
        .insert({
          email: 'client_test@test.com',
          first_name: 'Client',
          role: 'client'
        })
        .select()
        .single();

      if (testUser) {
        await supabase
          .from('client_profiles')
          .insert({
            id: testUser.id,
            company_name: 'Test Company',
            email: testUser.email,
            first_name: testUser.first_name
          });

        clients = [{ id: testUser.id }];
      }
    }

    if (!clients || clients.length === 0) throw new Error('Impossible de créer un client');

    // 5. Créer un projet test
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        title: 'Test IA Messagerie - ' + Date.now(),
        description: 'Projet de test pour vérifier que les IA apparaissent dans la messagerie',
        status: 'pause',
        owner_id: clients[0].id
      })
      .select()
      .single();

    if (projectError) throw projectError;
    results.projectCreated = true;
    results.projectId = project.id;

    console.log('✅ Projet créé:', project.title);

    // 6. Tester le trigger en créant une assignation
    const { data: assignment, error: assignmentError } = await supabase
      .from('hr_resource_assignments')
      .insert({
        project_id: project.id,
        profile_id: iaProfile.id,
        seniority: 'expert',
        booking_status: 'draft'
      })
      .select()
      .single();

    if (assignmentError) throw assignmentError;

    console.log('📋 Assignation créée avec status draft');

    // 7. DÉCLENCHER LE TRIGGER
    const { data: updatedAssignment, error: updateError } = await supabase
      .from('hr_resource_assignments')
      .update({ booking_status: 'recherche' })
      .eq('id', assignment.id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log('🔥 Trigger déclenché');
    console.log('Résultat:', {
      booking_status: updatedAssignment.booking_status,
      candidate_id: updatedAssignment.candidate_id
    });

    // Vérifier si le trigger a fonctionné
    if (updatedAssignment.booking_status === 'accepted' && updatedAssignment.candidate_id === iaProfile.id) {
      results.triggerWorking = true;
      console.log('✅ TRIGGER FONCTIONNE !');
    } else {
      console.log('❌ Trigger ne fonctionne pas');
    }

    // 8. Test du hook de messagerie
    const { data: messagingMembers } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        hr_profiles (
          name,
          is_ai,
          prompt_id
        )
      `)
      .eq('project_id', project.id)
      .in('booking_status', ['accepted', 'completed']);

    console.log('💬 Membres pour messagerie:', messagingMembers?.length || 0);

    if (messagingMembers && messagingMembers.length > 0) {
      for (const member of messagingMembers) {
        if (member.hr_profiles?.is_ai && member.candidate_id) {
          // Vérifier si le profil sera trouvé
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', member.candidate_id)
            .single();

          if (profile) {
            results.messagingWorks = true;
            console.log('✅ IA accessible pour la messagerie !');
          }
        }
      }
    }

    // Résumé final
    const summary = {
      '1. Ressource IA créée': results.iaCreated ? '✅' : '❌',
      '2. Profils créés': results.profilesCreated ? '✅' : '❌',
      '3. Projet créé': results.projectCreated ? '✅' : '❌',
      '4. Trigger fonctionne': results.triggerWorking ? '✅' : '❌',
      '5. Messagerie OK': results.messagingWorks ? '✅' : '❌'
    };

    console.log('📊 RÉSUMÉ FINAL:');
    Object.entries(summary).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test IA messagerie terminé',
        results,
        summary,
        testData: {
          projectId: project.id,
          projectTitle: project.title,
          iaName: iaProfile.name,
          iaId: iaProfile.id
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erreur test:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});