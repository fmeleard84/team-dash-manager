import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestData() {
  console.log('🔧 Création de données de test...');
  
  try {
    // 1. Créer un profil candidat pour l'utilisateur existant
    console.log('\n👤 Step 1: Création du profil candidat...');
    
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .insert({
        email: 'fmeleard+ressource_5@gmail.com',
        first_name: 'Meleard R',
        last_name: 'Francis R',
        qualification_status: 'qualified',
        password_hash: ''
      })
      .select()
      .single();
    
    if (candidateError) {
      console.error('❌ Erreur création candidat:', candidateError);
      return;
    }
    
    console.log('✅ Profil candidat créé:', candidateProfile);
    
    // 2. Vérifier s'il y a des projets existants
    console.log('\n📁 Step 2: Vérification des projets existants...');
    const { data: existingProjects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(5);
    
    if (projectsError) {
      console.error('❌ Erreur vérification projets:', projectsError);
    } else {
      console.log('📊 Projets existants:', existingProjects);
      
      if (!existingProjects || existingProjects.length === 0) {
        console.log('\n🔧 Step 3: Création de projets de test...');
        
        // Créer quelques projets de test
        const testProjects = [
          {
            title: 'Développement Site E-commerce',
            description: 'Création d\'un site e-commerce moderne avec React et Node.js',
            status: 'play',
            project_date: new Date().toISOString(),
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 jours
            client_budget: 5000
          },
          {
            title: 'Refonte Application Mobile',
            description: 'Modernisation d\'une application mobile existante',
            status: 'play',
            project_date: new Date().toISOString(),
            due_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // +45 jours
            client_budget: 8000
          },
          {
            title: 'API REST Backend',
            description: 'Développement d\'une API REST complète pour startup',
            status: 'play',
            project_date: new Date().toISOString(),
            due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // +60 jours
            client_budget: 3500
          }
        ];
        
        const { data: createdProjects, error: createProjectsError } = await supabase
          .from('projects')
          .insert(testProjects)
          .select();
        
        if (createProjectsError) {
          console.error('❌ Erreur création projets:', createProjectsError);
        } else {
          console.log('✅ Projets de test créés:', createdProjects);
          
          // 4. Créer des bookings pour le candidat
          console.log('\n📋 Step 4: Création de bookings de test...');
          
          const bookings = createdProjects.map(project => ({
            project_id: project.id,
            candidate_id: candidateProfile.id,
            status: 'accepted'
          }));
          
          const { data: createdBookings, error: bookingsError } = await supabase
            .from('project_bookings')
            .insert(bookings)
            .select();
          
          if (bookingsError) {
            console.error('❌ Erreur création bookings:', bookingsError);
          } else {
            console.log('✅ Bookings créés:', createdBookings);
          }
        }
      } else {
        console.log('✅ Projets existants trouvés, pas besoin d\'en créer');
        
        // Créer des bookings pour les projets existants
        console.log('\n📋 Step 3: Création de bookings avec projets existants...');
        
        const bookings = existingProjects.slice(0, 2).map(project => ({
          project_id: project.id,
          candidate_id: candidateProfile.id,
          status: 'accepted'
        }));
        
        const { data: createdBookings, error: bookingsError } = await supabase
          .from('project_bookings')
          .insert(bookings)
          .select();
        
        if (bookingsError) {
          console.error('❌ Erreur création bookings:', bookingsError);
        } else {
          console.log('✅ Bookings créés:', createdBookings);
        }
      }
    }
    
    console.log('\n🎉 Données de test créées avec succès !');
    console.log('👉 Maintenant fmeleard+ressource_5@gmail.com devrait voir ses projets');
    
  } catch (err) {
    console.error('💥 Erreur:', err);
  }
}

createTestData();