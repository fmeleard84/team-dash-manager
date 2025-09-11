import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRealtimeConnection() {
  try {
    console.log('1. Fetching ephemeral key...');
    const { data, error } = await supabase.functions.invoke('generate-realtime-key');
    
    if (error) {
      console.error('Error getting key:', error);
      return;
    }
    
    const ephemeralKey = data.ephemeralKey;
    console.log('2. Ephemeral key received:', ephemeralKey.substring(0, 20) + '...');
    
    console.log('3. Creating agent...');
    const agent = new RealtimeAgent({
      name: 'Assistant',
      instructions: 'You are a helpful assistant.'
    });
    
    console.log('4. Creating session...');
    const session = new RealtimeSession(agent, {
      model: 'gpt-4o-realtime-preview'
    });
    
    // Add event listeners
    session.on('connected', () => {
      console.log('✅ Session connected!');
    });
    
    session.on('error', (error) => {
      console.error('❌ Session error:', error);
    });
    
    session.on('disconnected', () => {
      console.log('Session disconnected');
    });
    
    console.log('5. Connecting to Realtime API...');
    await session.connect({
      apiKey: ephemeralKey
    });
    
    console.log('6. Connection successful!');
    
    // Wait a bit then disconnect
    setTimeout(() => {
      console.log('7. Disconnecting...');
      session.disconnect();
      process.exit(0);
    }, 3000);
    
  } catch (error) {
    console.error('Connection error:', error);
    process.exit(1);
  }
}

testRealtimeConnection();