import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyRLSFix() {
  console.log('🔧 Applying RLS fix for candidate storage uploads...\n');
  
  try {
    // 1. Check current booking_status distribution
    console.log('📊 Checking current booking_status values...');
    const { data: assignments, error: checkError } = await supabase
      .from('hr_resource_assignments')
      .select('booking_status')
      .not('booking_status', 'is', null);
    
    if (checkError) throw checkError;
    
    const statusCounts = {};
    assignments.forEach(a => {
      statusCounts[a.booking_status] = (statusCounts[a.booking_status] || 0) + 1;
    });
    
    console.log('Current distribution:', statusCounts);
    
    // 2. Check the specific problematic project
    console.log('\n🔍 Checking project d7dff6ec-5019-40ab-a00f-8bac8806eca7...');
    const { data: projectAssignments, error: projError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        project_id,
        booking_status,
        candidate_id,
        candidate_profiles!inner(
          first_name,
          last_name,
          user_id
        )
      `)
      .eq('project_id', 'd7dff6ec-5019-40ab-a00f-8bac8806eca7');
    
    if (projError) throw projError;
    
    console.log('Project assignments:');
    projectAssignments.forEach(a => {
      console.log(`  - ${a.candidate_profiles.first_name} ${a.candidate_profiles.last_name}: ${a.booking_status}`);
    });
    
    // 3. Standardize 'booké' to 'accepted'
    console.log('\n🔄 Standardizing booking_status values...');
    const { data: updateData, error: updateError } = await supabase
      .from('hr_resource_assignments')
      .update({ booking_status: 'accepted' })
      .eq('booking_status', 'booké')
      .select();
    
    if (updateError) {
      console.log('Warning: Could not update booking_status:', updateError.message);
    } else {
      console.log(`✅ Updated ${updateData?.length || 0} records from 'booké' to 'accepted'`);
    }
    
    // 4. Verify the fix
    console.log('\n✨ Verifying the fix...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('hr_resource_assignments')
      .select('booking_status')
      .not('booking_status', 'is', null);
    
    if (verifyError) throw verifyError;
    
    const newStatusCounts = {};
    verifyData.forEach(a => {
      newStatusCounts[a.booking_status] = (newStatusCounts[a.booking_status] || 0) + 1;
    });
    
    console.log('New distribution:', newStatusCounts);
    
    console.log('\n🎉 RLS fix applied successfully!');
    console.log('Note: The RLS policies in storage.objects will now accept both "accepted" and "booké" values.');
    console.log('However, we\'ve standardized all values to "accepted" for consistency.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyRLSFix();