import fetch from 'node-fetch';

async function invokeFunction() {
  const url = 'https://egdelmcijszuapcpglsy.supabase.co/functions/v1/apply-rpc-functions';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI2NjMxNzksImV4cCI6MjAzODIzOTE3OX0.BRBQan9kOPrrtbwkm5rF50oAxE7VpL7uQ8DPfTG7TAI';
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjY2MzE3OSwiZXhwIjoyMDM4MjM5MTc5fQ.jItJXjPhem5m9YqpOwOZJsCe4SAUsu77tuVIudX9gsU';

  try {
    console.log('🚀 Invoking apply-rpc-functions...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', data);
    } else {
      console.error('❌ Error:', data);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

invokeFunction();