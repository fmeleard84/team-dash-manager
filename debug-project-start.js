const projectId = '5221da5d-783a-4637-a400-937af8dabaa6';

async function debugProjectStart() {
  console.log('🔍 Debugging project start for:', projectId);
  
  try {
    const response = await fetch(
      'https://egdelmcijszuapcpglsy.supabase.co/functions/v1/debug-project-start',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjYwNDIxMywiZXhwIjoyMDM4MTgwMjEzfQ.pJ7cVCLl_Bj-2FSgfXOMOIG1qlpZlJzUs2LDKNoAMWo'
        },
        body: JSON.stringify({ projectId })
      }
    );

    const data = await response.json();
    console.log('\n📊 RESULTS:', JSON.stringify(data, null, 2));

    if (data.issues && data.issues.length > 0) {
      console.log('\n⚠️  ISSUES FOUND:');
      data.issues.forEach(issue => console.log('  -', issue));
    }

    if (data.stats) {
      console.log('\n📈 STATS:');
      console.log('  - Total assignments:', data.stats.totalAssignments);
      console.log('  - Accepted assignments:', data.stats.acceptedAssignments);
      console.log('  - Candidates found:', data.stats.candidatesFound);
      console.log('  - Can start:', data.stats.canStart);
      console.log('  - Ready for orchestrator:', data.stats.readyForOrchestrator);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugProjectStart();