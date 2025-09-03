import fetch from 'node-fetch';

async function testResourceBooking() {
  const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTkzNDE0MzEsImV4cCI6MjAzNDkxNzQzMX0.QrAhzowtpE0XSlERGmu_hWXGTdstLCjHlbfYfLecLRY';

  // Test with accept_mission action (the one that's failing)
  const testData = {
    action: 'accept_mission',
    assignment_id: 'test-id',
    candidate_email: 'test@example.com'
  };

  try {
    console.log('Testing resource-booking Edge Function...');
    console.log('Request data:', testData);

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
    console.log('Response text:', responseText);

    if (!response.ok) {
      console.error('Error response:', responseText);
    } else {
      try {
        const data = JSON.parse(responseText);
        console.log('Parsed response:', data);
      } catch (e) {
        console.log('Could not parse as JSON:', responseText);
      }
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testResourceBooking();