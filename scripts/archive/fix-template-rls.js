const SUPABASE_URL = 'https://egdelmcijszuapcpglsy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI1MDg4NDYsImV4cCI6MjAzODA4NDg0Nn0.n_tVOGcjMb8TZJ-E5yWGQpWBQ-EJMeqtCe5_h3AKsho'

async function fixTemplateRLS() {
  try {
    console.log('Calling fix-admin-template-rls function...')
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/fix-admin-template-rls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Template RLS policies fixed successfully!')
      console.log('Result:', result)
      
      if (result.policies) {
        console.log('\nCurrent policies:')
        result.policies.forEach(policy => {
          console.log(`- ${policy.tablename}: ${policy.policyname} (${policy.cmd})`)
        })
      }
    } else {
      console.error('❌ Error fixing template RLS policies:', result)
    }
  } catch (error) {
    console.error('❌ Network error:', error.message)
  }
}

fixTemplateRLS()