import fetch from 'node-fetch';

async function testErrorDetails() {
  const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

  const testData = {
    action: 'accept_mission',
    assignment_id: '2281cbca-ee31-4239-9961-5ce196c275f3',
    candidate_email: 'fmeleard+ressource@gmail.com'
  };

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/resource-booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify(testData)
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', responseText);

  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testErrorDetails();