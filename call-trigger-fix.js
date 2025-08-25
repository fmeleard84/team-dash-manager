async function callTriggerFix() {
  console.log('Calling apply-trigger-fix function...');
  
  const response = await fetch('https://egdelmcijszuapcpglsy.supabase.co/functions/v1/apply-trigger-fix', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjM0NDg1NywiZXhwIjoyMDM3OTIwODU3fQ.CjJz_Y-qFk7FBN7hv0sUg0MOkccNYKlxMpKNXdPUbVk'
    }
  });
  
  const result = await response.json();
  console.log('Response:', result);
  
  if (result.success) {
    console.log('✅ Trigger fixed successfully!');
  } else {
    console.error('❌ Failed to fix trigger:', result.error);
  }
}

callTriggerFix().catch(console.error);