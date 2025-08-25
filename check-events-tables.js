import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjI0OTIyNSwiZXhwIjoyMDM3ODI1MjI1fQ.tpbICL5m4fSm5T-ow7s0PO1SyJKdEmZNvocRuNalgrE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEventsTables() {
  console.log('🔍 Vérification des tables d\'événements...\n');
  
  try {
    // Chercher dans events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .limit(5);
    
    console.log('📅 Table "events":');
    if (eventsError) {
      console.log('  Erreur:', eventsError.message);
    } else if (events && events.length > 0) {
      events.forEach(e => {
        console.log(`  - ${e.title} (${e.event_date}) - Projet: ${e.project_id}`);
      });
    } else {
      console.log('  Aucun événement trouvé');
    }

    // Chercher dans project_events
    const { data: projectEvents, error: projectEventsError } = await supabase
      .from('project_events')
      .select('*')
      .limit(5);
    
    console.log('\n📅 Table "project_events":');
    if (projectEventsError) {
      console.log('  Erreur:', projectEventsError.message);
    } else if (projectEvents && projectEvents.length > 0) {
      projectEvents.forEach(e => {
        console.log(`  - ${e.title} (${e.start_at}) - Projet: ${e.project_id}`);
      });
    } else {
      console.log('  Aucun événement trouvé');
    }

    // Vérifier spécifiquement pour le projet "Comptable junior client_2"
    const projectTitle = 'Comptable junior client_2';
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('title', projectTitle)
      .single();

    if (project) {
      console.log(`\n🎯 Événements pour le projet "${projectTitle}" (${project.id}):`);
      
      // Dans events
      const { data: eventsForProject } = await supabase
        .from('events')
        .select('*')
        .eq('project_id', project.id);
      
      console.log('  Dans "events":', eventsForProject?.length || 0, 'événement(s)');
      eventsForProject?.forEach(e => {
        console.log(`    - ${e.title} (${e.event_date})`);
      });

      // Dans project_events
      const { data: projectEventsForProject } = await supabase
        .from('project_events')
        .select('*')
        .eq('project_id', project.id);
      
      console.log('  Dans "project_events":', projectEventsForProject?.length || 0, 'événement(s)');
      projectEventsForProject?.forEach(e => {
        console.log(`    - ${e.title} (${e.start_at})`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkEventsTables().catch(console.error);