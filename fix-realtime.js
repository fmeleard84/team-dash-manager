import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI0OTE0MTUsImV4cCI6MjAzODA2NzQxNX0.8hv5MYXO2kbbn8kfNnPnFRREkLfrT5jnxGlr7h0kZTU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixRealtimeAndRatings() {
  try {
    const { data, error } = await supabase.functions.invoke('fix-realtime-and-ratings');
    
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Success!');
      console.log('Results:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

fixRealtimeAndRatings();