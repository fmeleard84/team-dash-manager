import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQzMTU1MjQsImV4cCI6MjAzOTg5MTUyNH0.vTwf-0OI2PpIzgb5EjrcYT2wFBD1dTOOQiTdWCIXWF8'
);

async function testDebug() {
  console.log('🔍 Testing debug function...');
  
  try {
    const { data, error } = await supabase.functions.invoke('debug-candidate-assignments-detailed', {
      body: { 
        candidateProfileId: '922efb64-1684-45ec-8aea-436c4dad2f37', 
        seniority: 'intermediate' 
      }
    });
    
    console.log('✅ Debug function result:', JSON.stringify(data, null, 2));
    if (error) console.log('❌ Debug function error:', error);
    
  } catch (err) {
    console.error('❌ Invoke error:', err);
  }
}

testDebug();