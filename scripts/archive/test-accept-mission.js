import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI2MDI2MzUsImV4cCI6MjAzODE3ODYzNX0.cyMSSso0Hd8ERwJTSBdD1xk2CZrj1k6JQsZ2lQQZE1c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAcceptMission() {
  try {
    const { data, error } = await supabase.functions.invoke('resource-booking', {
      body: {
        action: 'accept_mission',
        assignment_id: 'cc2bff24-4dea-4ab0-90cf-184849031ced',
        candidate_email: 'fmeleard+ressource_5@gmail.com'
      }
    });

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Response:', data);
  } catch (err) {
    console.error('Exception:', err.message);
  }
}

testAcceptMission();