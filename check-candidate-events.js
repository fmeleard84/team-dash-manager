import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjI0OTIyNSwiZXhwIjoyMDM3ODI1MjI1fQ.tpbICL5m4fSm5T-ow7s0PO1SyJKdEmZNvocRuNalgrE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCandidateEvents() {
  console.log('🔍 Vérification des événements pour le candidat...\n');
  
  try {
    // 1. Get candidate profile - try multiple approaches
    const candidateEmail = 'fmeleard+ressource_2@gmail.com';
    
    // First try by email
    let { data: candidateProfile } = await supabase
      .from('candidate_profiles')
      .select('id, email, profile_id')
      .eq('email', candidateEmail)
      .single();
    
    // If not found, try through profiles table
    if (!candidateProfile) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', candidateEmail)
        .single();
      
      if (profile) {
        const { data: cp } = await supabase
          .from('candidate_profiles')
          .select('id, email, profile_id')
          .eq('profile_id', profile.id)
          .single();
        candidateProfile = cp;
      }
    }
    
    if (!candidateProfile) {
      console.log('❌ Candidat non trouvé');
      return;
    }
    
    console.log('👤 Candidat trouvé:', candidateProfile);
    
    // 2. Get candidate's assignments
    const { data: assignments } = await supabase
      .from('hr_resource_assignments')
      .select(`
        *,
        projects (
          id,
          title,
          status,
          project_date
        )
      `)
      .eq('candidate_id', candidateProfile.id)
      .eq('booking_status', 'accepted');
    
    console.log('\n📋 Assignments du candidat:');
    assignments?.forEach(a => {
      console.log(`  - Projet: ${a.projects?.title} (${a.projects?.id})`);
      console.log(`    Status: ${a.projects?.status}`);
      console.log(`    Date: ${a.projects?.project_date}`);
    });
    
    // 3. Get ALL projects (not just play status) for debugging
    const projectIds = assignments?.map(a => a.project_id).filter(Boolean) || [];
    
    if (projectIds.length === 0) {
      console.log('\n❌ Aucun projet trouvé pour ce candidat');
      return;
    }
    
    // 4. Check events for these projects
    console.log('\n📅 Recherche des événements pour les projets:', projectIds);
    
    const { data: events } = await supabase
      .from('project_events')
      .select('*')
      .in('project_id', projectIds);
    
    console.log('\n📅 Événements trouvés:');
    if (events && events.length > 0) {
      events.forEach(e => {
        console.log(`  - ${e.title}`);
        console.log(`    ID: ${e.id}`);
        console.log(`    Projet: ${e.project_id}`);
        console.log(`    Date: ${e.start_at}`);
        console.log(`    Description: ${e.description}`);
      });
    } else {
      console.log('  Aucun événement trouvé');
    }
    
    // 5. Check specific project
    const specificProjectId = '16fd6a53-d0ed-49e9-aec6-99813eb23738';
    console.log(`\n🎯 Vérification spécifique pour le projet ${specificProjectId}:`);
    
    const { data: specificEvents } = await supabase
      .from('project_events')
      .select('*')
      .eq('project_id', specificProjectId);
    
    if (specificEvents && specificEvents.length > 0) {
      console.log('  Événements trouvés:');
      specificEvents.forEach(e => {
        console.log(`    - ${e.title} (${e.start_at})`);
      });
    } else {
      console.log('  ❌ Aucun événement pour ce projet');
    }
    
    // 6. Check project status
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', specificProjectId)
      .single();
    
    console.log('\n📊 Détails du projet:');
    console.log(`  Titre: ${project?.title}`);
    console.log(`  Status: ${project?.status}`);
    console.log(`  Date projet: ${project?.project_date}`);
    console.log(`  Kickoff planifié: ${project?.kickoff_date}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkCandidateEvents().catch(console.error);