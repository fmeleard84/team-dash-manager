import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjI0OTIyNSwiZXhwIjoyMDM3ODI1MjI1fQ.tpbICL5m4fSm5T-ow7s0PO1SyJKdEmZNvocRuNalgrE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestCandidate() {
  console.log('🚀 Création d\'un candidat de test avec événement...\n');
  
  try {
    // 1. Check if user exists
    const email = 'fmeleard+ressource_2@gmail.com';
    
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    let profileId;
    
    if (existingProfile) {
      console.log('✅ Profile existe déjà:', existingProfile.id);
      profileId = existingProfile.id;
      
      // Update to candidate type
      await supabase
        .from('profiles')
        .update({ user_type: 'candidate' })
        .eq('id', profileId);
    } else {
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: 'Test123!@#',
        email_confirm: true
      });
      
      if (authError) {
        console.error('Auth error:', authError);
        return;
      }
      
      console.log('✅ Auth user créé:', authData.user.id);
      
      // Profile should be created automatically by trigger
      // Wait a bit for trigger
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: newProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();
      
      if (newProfile) {
        profileId = newProfile.id;
        console.log('✅ Profile créé:', profileId);
      }
    }
    
    // 2. Create or update candidate profile
    const { data: candidateProfile } = await supabase
      .from('candidate_profiles')
      .upsert({
        profile_id: profileId,
        email: email,
        seniority: 'junior',
        status: 'disponible',
        skills: ['JavaScript', 'React', 'Node.js'],
        hourly_rate: 50
      })
      .select()
      .single();
    
    console.log('✅ Candidate profile créé/mis à jour:', candidateProfile.id);
    
    // 3. Find a project to assign
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'play')
      .limit(1);
    
    if (!projects || projects.length === 0) {
      console.log('❌ Aucun projet actif trouvé');
      return;
    }
    
    const project = projects[0];
    console.log('📁 Projet trouvé:', project.title, '(', project.id, ')');
    
    // 4. Create assignment
    const { data: assignment } = await supabase
      .from('hr_resource_assignments')
      .upsert({
        project_id: project.id,
        profile_id: profileId,
        candidate_id: candidateProfile.id,
        seniority: 'junior',
        booking_status: 'accepted',
        booking_data: {
          accepted_at: new Date().toISOString(),
          accepted_by: candidateProfile.id
        }
      })
      .select()
      .single();
    
    console.log('✅ Assignment créé:', assignment.id);
    
    // 5. Create a kickoff event for tomorrow at 10am
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const { data: event } = await supabase
      .from('project_events')
      .insert({
        project_id: project.id,
        title: `Kickoff - ${project.title}`,
        description: 'Réunion de lancement du projet avec toute l\'équipe',
        start_at: tomorrow.toISOString(),
        end_at: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour
        location: 'Visioconférence',
        video_url: `https://meet.jit.si/${project.id}-kickoff`,
        created_by: project.owner_id
      })
      .select()
      .single();
    
    console.log('✅ Événement kickoff créé pour demain 10h:', event.id);
    
    // 6. Add candidate as attendee
    await supabase
      .from('project_event_attendees')
      .insert({
        event_id: event.id,
        email: email,
        required: true,
        response_status: 'pending'
      });
    
    console.log('✅ Candidat ajouté comme participant');
    
    console.log('\n✨ Configuration terminée!');
    console.log('   Email:', email);
    console.log('   Password: Test123!@#');
    console.log('   Projet:', project.title);
    console.log('   Kickoff: Demain 10h');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

createTestCandidate().catch(console.error);