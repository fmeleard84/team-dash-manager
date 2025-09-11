import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEphemeralKey() {
  console.log('Testing ephemeral key generation...');
  
  try {
    const { data, error } = await supabase.functions.invoke('generate-realtime-key');
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Success! Ephemeral key received:');
    console.log('Key:', data.ephemeralKey ? data.ephemeralKey.substring(0, 20) + '...' : 'No key');
    console.log('Expires in:', data.expiresIn, 'seconds');
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

testEphemeralKey();