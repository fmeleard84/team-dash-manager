const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProjectState() {
  console.log('📊 Checking project states...\n');
  
  try {
    // Find recent projects
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        status,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (projectError) {
      console.error('❌ Error fetching projects:', projectError);
      return;
    }

    console.log(`Found ${projects.length} recent projects:\n`);

    for (const project of projects) {
      console.log(`📁 Project: "${project.title}" (${project.id})`);
      console.log(`   Status: ${project.status}`);
      console.log(`   Created: ${new Date(project.created_at).toLocaleString()}`);

      // Get assignments for this project
      const { data: assignments, error: assignmentError } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          booking_status,
          booking_data
        `)
        .eq('project_id', project.id);

      if (assignmentError) {
        console.error('❌ Error fetching assignments:', assignmentError);
        continue;
      }

      console.log(`   📋 Assignments (${assignments.length} total):`);
      
      const statusCounts = {};
      assignments.forEach(assignment => {
        statusCounts[assignment.booking_status] = (statusCounts[assignment.booking_status] || 0) + 1;
        if (assignment.booking_data?.candidate_email) {
          console.log(`      - ${assignment.booking_status}: ${assignment.booking_data.candidate_email}`);
        } else {
          console.log(`      - ${assignment.booking_status}: No candidate assigned`);
        }
      });

      console.log(`   📊 Status Summary:`, statusCounts);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkProjectState().then(() => {
  console.log('🏁 Check completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Check failed:', error);
  process.exit(1);
});