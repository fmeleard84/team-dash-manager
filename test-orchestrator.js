import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testOrchestrator() {
  const projectId = '5221da5d-783a-4637-a400-937af8dabaa6';
  
  console.log('🧪 Testing project-orchestrator for:', projectId);
  
  try {
    // Make direct fetch to get error details
    const response = await fetch('https://egdelmcijszuapcpglsy.supabase.co/functions/v1/project-orchestrator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        action: 'setup-project',
        projectId
      })
    });
    
    const text = await response.text();
    console.log('\n📦 Response Status:', response.status);
    console.log('Response Body:', text);
    
    if (!response.ok) {
      console.error('\n❌ Error response received');
      try {
        const errorData = JSON.parse(text);
        console.log('Parsed error:', errorData);
      } catch {
        console.log('Could not parse as JSON');
      }
    }
    
  } catch (err) {
    console.error('\n💥 Exception:', err);
  }
}

testOrchestrator();