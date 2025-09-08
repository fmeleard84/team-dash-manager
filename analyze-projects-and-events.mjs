import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.t01tVJvLQZsPImuuTxvmVTtxFpDMQbRrRBYs7BLfLno';

// Utiliser service role pour contourner RLS
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('=== ANALYSE COMPLÈTE DES PROJETS ET ÉVÉNEMENTS ===\n');

// 1. Rechercher les projets 0832 et 0937
console.log('1. RECHERCHE DES PROJETS 0832 ET 0937');
console.log('=' .repeat(50));

const { data: projects, error: projectsError } = await supabase
  .from('projects')
  .select('*')
  .or('title.ilike.%0832%,title.ilike.%0937%');

if (projectsError) {
  console.error('Erreur recherche projets:', projectsError);
} else if (projects && projects.length > 0) {
  console.log(`✅ ${projects.length} projet(s) trouvé(s):\n`);
  
  for (const project of projects) {
    console.log(`📁 Projet: ${project.title}`);
    console.log(`   ID: ${project.id}`);
    console.log(`   Status: ${project.status}`);
    console.log(`   Owner ID: ${project.owner_id}`);
    console.log(`   Créé le: ${new Date(project.created_at).toLocaleString()}`);
    
    // Vérifier le propriétaire
    const { data: owner } = await supabase
      .from('client_profiles')
      .select('id, email, first_name, last_name')
      .eq('id', project.owner_id)
      .single();
    
    if (owner) {
      console.log(`   👤 Client: ${owner.first_name} ${owner.last_name} (${owner.email})`);
    }
    
    // Vérifier les ressources assignées
    console.log('\n   📊 Équipe du projet:');
    const { data: assignments } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        candidate_profiles (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('project_id', project.id);
    
    if (assignments && assignments.length > 0) {
      console.log(`   ${assignments.length} ressource(s) assignée(s):`);
      assignments.forEach(a => {
        if (a.candidate_profiles) {
          console.log(`     - ${a.candidate_profiles.first_name} ${a.candidate_profiles.last_name}`);
          console.log(`       ID: ${a.candidate_id}`);
          console.log(`       Status: ${a.booking_status}`);
        }
      });
    } else {
      console.log('   ❌ Aucune ressource assignée');
    }
    
    // 2. Rechercher les événements Kickoff
    console.log('\n   📅 Événements du projet:');
    const { data: events } = await supabase
      .from('project_events')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false });
    
    if (events && events.length > 0) {
      console.log(`   ${events.length} événement(s) trouvé(s):`);
      
      for (const event of events) {
        console.log(`\n   🎯 ${event.title}`);
        console.log(`      ID: ${event.id}`);
        console.log(`      Date: ${new Date(event.start_at).toLocaleString()}`);
        console.log(`      Créé par: ${event.created_by}`);
        
        // 3. Vérifier les participants
        console.log('\n      👥 Participants enregistrés:');
        const { data: attendees } = await supabase
          .from('project_event_attendees')
          .select('*')
          .eq('event_id', event.id);
        
        if (attendees && attendees.length > 0) {
          console.log(`      ✅ ${attendees.length} participant(s) enregistré(s):`);
          
          for (const att of attendees) {
            console.log(`\n      Participant #${att.id}:`);
            console.log(`        - user_id: ${att.user_id || '❌ NULL'}`);
            console.log(`        - email: ${att.email || 'non défini'}`);
            console.log(`        - role: ${att.role || 'non défini'}`);
            console.log(`        - response_status: ${att.response_status || 'non défini'}`);
            console.log(`        - required: ${att.required}`);
            
            // Vérifier si user_id correspond à un profil
            if (att.user_id) {
              // Vérifier dans client_profiles
              const { data: clientProfile } = await supabase
                .from('client_profiles')
                .select('id, email, first_name, last_name')
                .eq('id', att.user_id)
                .single();
              
              if (clientProfile) {
                console.log(`        ✅ Trouvé dans client_profiles: ${clientProfile.first_name} ${clientProfile.last_name}`);
              } else {
                // Vérifier dans candidate_profiles
                const { data: candidateProfile } = await supabase
                  .from('candidate_profiles')
                  .select('id, email, first_name, last_name')
                  .eq('id', att.user_id)
                  .single();
                
                if (candidateProfile) {
                  console.log(`        ✅ Trouvé dans candidate_profiles: ${candidateProfile.first_name} ${candidateProfile.last_name}`);
                } else {
                  console.log(`        ❌ user_id ${att.user_id} non trouvé dans aucune table de profils`);
                }
              }
            } else {
              console.log(`        ⚠️ user_id NULL - participant non identifiable`);
            }
          }
        } else {
          console.log(`      ❌ AUCUN PARTICIPANT ENREGISTRÉ !`);
        }
      }
    } else {
      console.log('   ❌ Aucun événement');
    }
    
    console.log('\n' + '=' .repeat(50) + '\n');
  }
} else {
  console.log('❌ Aucun projet 0832 ou 0937 trouvé');
}

// 4. Vérifier la structure de la table project_event_attendees
console.log('\n4. STRUCTURE DE LA TABLE project_event_attendees');
console.log('=' .repeat(50));

const { data: tableInfo, error: tableError } = await supabase.rpc('exec_sql', {
  sql: `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'project_event_attendees'
    ORDER BY ordinal_position;
  `
});

if (tableInfo) {
  console.log('Colonnes de la table:');
  tableInfo.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
  });
}

// 5. Vérifier les policies RLS
console.log('\n5. POLICIES RLS sur project_event_attendees');
console.log('=' .repeat(50));

const { data: policies } = await supabase.rpc('exec_sql', {
  sql: `
    SELECT polname, polcmd, polroles
    FROM pg_policies
    WHERE tablename = 'project_event_attendees';
  `
});

if (policies && policies.length > 0) {
  console.log('Policies actives:');
  policies.forEach(p => {
    console.log(`  - ${p.polname} (${p.polcmd})`);
  });
} else {
  console.log('❌ Aucune policy RLS trouvée');
}

// 6. Test d'insertion directe
console.log('\n6. TEST D\'INSERTION DIRECTE');
console.log('=' .repeat(50));

// Trouver un événement récent pour tester
const { data: testEvent } = await supabase
  .from('project_events')
  .select('id, title, project_id')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

if (testEvent) {
  console.log(`Test sur événement: ${testEvent.title} (ID: ${testEvent.id})`);
  
  // Récupérer l'équipe du projet
  const { data: testProject } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', testEvent.project_id)
    .single();
  
  if (testProject && testProject.owner_id) {
    console.log(`Tentative d'ajout du owner_id: ${testProject.owner_id}`);
    
    // Essayer d'insérer
    const { data: insertResult, error: insertError } = await supabase
      .from('project_event_attendees')
      .insert({
        event_id: testEvent.id,
        user_id: testProject.owner_id,
        email: 'test@example.com',
        role: 'client',
        required: true,
        response_status: 'pending'
      })
      .select();
    
    if (insertError) {
      console.log(`❌ Erreur insertion: ${insertError.message}`);
      console.log(`   Code: ${insertError.code}`);
      console.log(`   Détails: ${JSON.stringify(insertError.details)}`);
    } else {
      console.log(`✅ Insertion réussie:`, insertResult);
      
      // Nettoyer
      if (insertResult && insertResult[0]) {
        await supabase
          .from('project_event_attendees')
          .delete()
          .eq('id', insertResult[0].id);
        console.log('   (entrée de test supprimée)');
      }
    }
  }
}

console.log('\n' + '=' .repeat(50));
console.log('ANALYSE TERMINÉE');

process.exit(0);