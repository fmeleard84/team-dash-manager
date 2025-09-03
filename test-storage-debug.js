// Test debug storage RLS function
const testDebug = async () => {
  try {
    const response = await fetch('https://egdelmcijszuapcpglsy.supabase.co/functions/v1/debug-storage-rls', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDMyODYxNywiZXhwIjoyMDM5OTA0NjE3fQ.MN9KQRFTOfqEqvJ7Z_-9DG7nXPPGg8VLZqRX2qTMxPE',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDMyODYxNywiZXhwIjoyMDM5OTA0NjE3fQ.MN9KQRFTOfqEqvJ7Z_-9DG7nXPPGg8VLZqRX2qTMxPE',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const result = await response.json();
    console.log('🔍 Debug Storage RLS Results:');
    console.log(JSON.stringify(result, null, 2));

    // Analyze the results
    if (result.success && result.analysis) {
      console.log('\n📊 ANALYSIS SUMMARY:');
      console.log('===================');
      
      console.log('\n📋 RLS Policies Found:');
      if (result.analysis.policies && result.analysis.policies.length > 0) {
        result.analysis.policies.forEach((policy, i) => {
          console.log(`${i + 1}. ${policy.policyname} (${policy.cmd})`);
          console.log(`   Condition: ${policy.qual}`);
        });
      } else {
        console.log('❌ No member policies found!');
      }

      console.log('\n👤 Candidate Data:');
      if (result.analysis.candidateData && result.analysis.candidateData.length > 0) {
        const candidate = result.analysis.candidateData[0];
        console.log(`   Name: ${candidate.first_name} ${candidate.last_name}`);
        console.log(`   Profile user_id: ${candidate.user_id}`);
        console.log(`   Auth user_id: ${candidate.auth_user_id}`);
        console.log(`   Match: ${candidate.user_id === candidate.auth_user_id ? '✅' : '❌'}`);
      } else {
        console.log('❌ Candidate not found!');
      }

      console.log('\n📂 Project Assignments:');
      if (result.analysis.assignments && result.analysis.assignments.length > 0) {
        result.analysis.assignments.forEach((assignment, i) => {
          console.log(`${i + 1}. Candidate: ${assignment.first_name}`);
          console.log(`   Booking Status: ${assignment.booking_status}`);
          console.log(`   User ID: ${assignment.user_id}`);
        });
      } else {
        console.log('❌ No assignments found!');
      }

      console.log('\n👔 Client Data:');
      if (result.analysis.clientData && result.analysis.clientData.length > 0) {
        const client = result.analysis.clientData[0];
        console.log(`   Project ID: ${client.project_id}`);
        console.log(`   Owner ID: ${client.owner_id}`);
        console.log(`   Owner Email: ${client.owner_email}`);
      }

      console.log('\n🔐 All Storage Policies:');
      if (result.analysis.allPolicies && result.analysis.allPolicies.length > 0) {
        result.analysis.allPolicies.forEach((policy, i) => {
          console.log(`${i + 1}. ${policy.policyname} (${policy.cmd})`);
          if (policy.qual) {
            console.log(`   Condition: ${policy.qual}`);
          }
        });
      }

      // Summary
      console.log('\n🎯 DIAGNOSTIC SUMMARY:');
      console.log('=====================');
      console.log(`Candidate Found: ${result.summary.candidateFound ? '✅' : '❌'}`);
      console.log(`Assignment Found: ${result.summary.assignmentFound ? '✅' : '❌'}`);
      console.log(`Booking Status: ${result.summary.bookingStatus || 'N/A'}`);
      console.log(`User ID Match: ${result.summary.userIdMatch ? '✅' : '❌'}`);
    }

  } catch (error) {
    console.error('❌ Error testing debug function:', error);
  }
};

testDebug();