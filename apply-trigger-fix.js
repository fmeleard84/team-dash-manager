async function applyTriggerFix() {
  console.log('Applying trigger fix via Supabase function...');
  
  const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co';
  
  try {
    // Call the deployed function using fetch
    const response = await fetch(`${SUPABASE_URL}/functions/v1/fix-trigger-direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Trigger fixed successfully!');
      console.log('Result:', result);
    } else {
      console.error('❌ Failed to fix trigger:', result);
      
      // If the function call failed, try alternative approach
      console.log('\nTrying alternative approach via create-exec-sql function...');
      
      const altResponse = await fetch(`${SUPABASE_URL}/functions/v1/create-exec-sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const altResult = await altResponse.json();
      console.log('Alternative result:', altResult);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

applyTriggerFix().catch(console.error);