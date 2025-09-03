import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixCandidateUserLinks() {
  console.log('🔧 Fixing candidate user_id links...\n');
  
  try {
    // 1. Find candidates with missing or incorrect user_id
    console.log('📊 Checking all candidates...');
    const { data: candidates, error: candError } = await supabase
      .from('candidate_profiles')
      .select('id, email, first_name, last_name, user_id');
    
    if (candError) throw candError;
    
    console.log(`Found ${candidates.length} candidates total\n`);
    
    // 2. Check auth.users to find corresponding accounts
    const { data: authUsers, error: authError } = await supabase
      .from('profiles')
      .select('id, email');
    
    if (authError) throw authError;
    
    // 3. Create email->userId map from auth users
    const emailToUserId = {};
    authUsers.forEach(user => {
      if (user.email) {
        emailToUserId[user.email.toLowerCase()] = user.id;
      }
    });
    
    // 4. Find and fix mismatched candidates
    const toFix = [];
    candidates.forEach(candidate => {
      const authUserId = emailToUserId[candidate.email?.toLowerCase()];
      
      if (authUserId && candidate.user_id !== authUserId) {
        toFix.push({
          ...candidate,
          correct_user_id: authUserId,
          needs_fix: true
        });
      } else if (!candidate.user_id && authUserId) {
        toFix.push({
          ...candidate,
          correct_user_id: authUserId,
          needs_fix: true
        });
      }
    });
    
    console.log(`🔍 Found ${toFix.length} candidates needing user_id fix:\n`);
    
    // 5. Fix each candidate
    for (const candidate of toFix) {
      console.log(`Fixing ${candidate.first_name} ${candidate.last_name}:`);
      console.log(`  Email: ${candidate.email}`);
      console.log(`  Old user_id: ${candidate.user_id || 'NULL'}`);
      console.log(`  New user_id: ${candidate.correct_user_id}`);
      
      const { error: updateError } = await supabase
        .from('candidate_profiles')
        .update({ user_id: candidate.correct_user_id })
        .eq('id', candidate.id);
      
      if (updateError) {
        console.log(`  ❌ Error: ${updateError.message}`);
      } else {
        console.log(`  ✅ Fixed!`);
      }
      console.log('');
    }
    
    // 6. Verify the specific problematic candidate
    console.log('\n🎯 Checking CDP FM 2708 specifically...');
    const { data: cdpCheck, error: cdpError } = await supabase
      .from('candidate_profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        user_id,
        hr_resource_assignments!inner(
          project_id,
          booking_status
        )
      `)
      .eq('first_name', 'CDP FM 2708')
      .single();
    
    if (!cdpError && cdpCheck) {
      console.log('CDP FM 2708 status:');
      console.log(`  Email: ${cdpCheck.email}`);
      console.log(`  User ID: ${cdpCheck.user_id}`);
      console.log(`  Has auth account: ${cdpCheck.user_id ? 'Yes' : 'No'}`);
      
      // Check if this user_id exists in auth.users
      const { data: authCheck } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('id', cdpCheck.user_id)
        .single();
      
      if (authCheck) {
        console.log(`  Auth email matches: ${authCheck.email === cdpCheck.email ? 'Yes' : 'No'}`);
      } else {
        console.log(`  ⚠️  No auth account found with this user_id!`);
      }
    }
    
    console.log('\n✨ Done! Candidates should now be able to upload files.');
    console.log('If the problem persists, the candidate may need to log out and log back in.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixCandidateUserLinks();