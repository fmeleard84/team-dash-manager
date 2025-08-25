// Debug script to check candidate matching for project "Claude 2"
const { createClient } = require('@supabase/supabase-js');

// Note: These are the dev/local credentials visible in config.toml
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDMzNjQ2MiwiZXhwIjoyMDQ5OTEyNDYyfQ.3qCFH8jNVPKrwRg4i3k8WvT6w_kkStJVPpLK8VNLJzQ'; // Service role key

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCandidateMatching() {
  console.log('=== DEBUG: Candidate Matching for Project "Claude 2" ===\n');

  try {
    // Query 1: Get candidate profile
    console.log('1. CANDIDATE PROFILE:');
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('email', 'fmeleard+ressource@gmail.com');

    if (candidateError) {
      console.error('Error fetching candidate:', candidateError);
      return;
    }

    if (candidateData.length === 0) {
      console.log('❌ No candidate found with email: fmeleard+ressource@gmail.com');
      return;
    }

    const candidate = candidateData[0];
    console.log(`✅ Found candidate:`);
    console.log(`   ID: ${candidate.id}`);
    console.log(`   Email: ${candidate.email}`);
    console.log(`   Name: ${candidate.first_name} ${candidate.last_name}`);
    console.log(`   Profile ID: ${candidate.profile_id}`);
    console.log(`   Seniority: ${candidate.seniority}`);
    console.log('');

    // Query 2: Get candidate's languages
    console.log('2. CANDIDATE LANGUAGES:');
    const { data: candidateLanguages, error: langError } = await supabase
      .from('candidate_languages')
      .select(`
        language_id,
        hr_languages:language_id (
          name,
          code
        )
      `)
      .eq('candidate_id', candidate.id);

    if (langError) {
      console.error('Error fetching candidate languages:', langError);
    } else {
      console.log(`   Languages: ${candidateLanguages.map(cl => cl.hr_languages.name).join(', ') || 'None'}`);
    }

    // Query 3: Get candidate's expertises
    console.log('3. CANDIDATE EXPERTISES:');
    const { data: candidateExpertises, error: expError } = await supabase
      .from('candidate_expertises')
      .select(`
        expertise_id,
        hr_expertises:expertise_id (
          name
        )
      `)
      .eq('candidate_id', candidate.id);

    if (expError) {
      console.error('Error fetching candidate expertises:', expError);
    } else {
      console.log(`   Expertises: ${candidateExpertises.map(ce => ce.hr_expertises.name).join(', ') || 'None'}`);
    }
    console.log('');

    // Query 4: Get project "Claude 2" and its resource assignments
    console.log('4. PROJECT "Claude 2" AND RESOURCE ASSIGNMENTS:');
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        hr_resource_assignments (
          *,
          hr_profiles:profile_id (
            name,
            category_id,
            hr_categories:category_id (
              name
            )
          )
        )
      `)
      .ilike('title', '%Claude 2%');

    if (projectError) {
      console.error('Error fetching project:', projectError);
      return;
    }

    if (projectData.length === 0) {
      console.log('❌ No project found with title containing "Claude 2"');
      return;
    }

    const project = projectData[0];
    console.log(`✅ Found project:`);
    console.log(`   ID: ${project.id}`);
    console.log(`   Title: ${project.title}`);
    console.log(`   Status: ${project.status}`);
    console.log('');

    console.log(`   Resource Assignments (${project.hr_resource_assignments.length}):`);
    for (const assignment of project.hr_resource_assignments) {
      console.log(`   - Profile: ${assignment.hr_profiles.name} (${assignment.hr_profiles.hr_categories.name})`);
      console.log(`     Profile ID: ${assignment.profile_id}`);
      console.log(`     Seniority: ${assignment.seniority}`);
      console.log(`     Languages: ${assignment.languages.join(', ') || 'None'}`);
      console.log(`     Expertises: ${assignment.expertises.join(', ') || 'None'}`);
      console.log(`     Price: ${assignment.calculated_price}`);
      console.log('');
    }

    // Query 5: Get hr_profiles that match candidate's profile_id
    console.log('5. PROFILE MATCHING:');
    const candidateProfileId = candidate.profile_id;
    
    if (candidateProfileId) {
      const { data: profileData, error: profileError } = await supabase
        .from('hr_profiles')
        .select(`
          *,
          hr_categories:category_id (
            name
          )
        `)
        .eq('id', candidateProfileId);

      if (profileError) {
        console.error('Error fetching candidate profile:', profileError);
      } else if (profileData.length > 0) {
        const profile = profileData[0];
        console.log(`✅ Candidate's profile:`);
        console.log(`   Name: ${profile.name}`);
        console.log(`   Category: ${profile.hr_categories.name}`);
        console.log(`   Base Price: ${profile.base_price}`);
        console.log('');

        // Check if candidate's profile matches any project assignment
        const matchingAssignments = project.hr_resource_assignments.filter(
          assignment => assignment.profile_id === candidateProfileId
        );

        if (matchingAssignments.length > 0) {
          console.log(`✅ PROFILE MATCH FOUND! ${matchingAssignments.length} matching assignment(s):`);
          matchingAssignments.forEach((assignment, index) => {
            console.log(`   Assignment ${index + 1}:`);
            console.log(`     Seniority required: ${assignment.seniority}`);
            console.log(`     Candidate seniority: ${candidate.seniority}`);
            console.log(`     Languages required: ${assignment.languages.join(', ') || 'None'}`);
            console.log(`     Expertises required: ${assignment.expertises.join(', ') || 'None'}`);
          });
        } else {
          console.log(`❌ NO PROFILE MATCH: Candidate profile "${profile.name}" not required in project assignments`);
        }
      }
    } else {
      console.log('❌ Candidate has no profile_id set');
    }

    // Query 6: Check if there are any mission requests/notifications for this candidate
    console.log('6. CHECKING MISSION REQUESTS/NOTIFICATIONS:');
    const { data: missionRequests, error: missionError } = await supabase
      .from('candidate_project_assignments')
      .select('*')
      .eq('candidate_id', candidate.id)
      .eq('project_id', project.id);

    if (missionError) {
      console.error('Error fetching mission requests:', missionError);
    } else {
      console.log(`   Mission requests for this candidate/project: ${missionRequests.length}`);
      if (missionRequests.length > 0) {
        missionRequests.forEach((request, index) => {
          console.log(`   Request ${index + 1}: Status = ${request.status}, Assigned = ${request.assigned_at}`);
        });
      }
    }

  } catch (error) {
    console.error('General error:', error);
  }
}

// Run the debug
debugCandidateMatching();