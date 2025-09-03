const projectId = '5221da5d-783a-4637-a400-937af8dabaa6';

async function fixCandidates() {
  console.log('🔧 Fixing missing candidates for project:', projectId);
  
  try {
    const response = await fetch(
      'https://egdelmcijszuapcpglsy.supabase.co/functions/v1/fix-missing-candidates',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
        },
        body: JSON.stringify({ projectId })
      }
    );

    const data = await response.json();
    console.log('\n📊 RESULTS:', JSON.stringify(data, null, 2));

    if (data.stats) {
      console.log('\n📈 STATS:');
      console.log('  - Total assignments:', data.stats.totalAssignments);
      console.log('  - Candidates found:', data.stats.candidatesFound);
      console.log('  - Candidates created:', data.stats.candidatesCreated);
      console.log('  - Errors:', data.stats.errors);
    }

    if (data.created && data.created.length > 0) {
      console.log('\n✅ Created candidates:');
      data.created.forEach(c => {
        console.log(`  - ${c.first_name} ${c.last_name} (${c.email})`);
      });
    }

    if (data.errors && data.errors.length > 0) {
      console.log('\n⚠️  ERRORS:');
      data.errors.forEach(e => console.log('  -', e));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixCandidates();