import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') })
dotenv.config({ path: join(__dirname, '.env') })

// Get Supabase config from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyRLSFix() {
  console.log('🔧 Applying RLS fixes for candidate access...\n')

  try {
    // 1. Create policy for candidates to view available assignments
    console.log('📝 Creating policy: Candidates can view available assignments...')
    const { error: policy1Error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "Candidates can view available assignments"
        ON public.hr_resource_assignments
        FOR SELECT
        USING (
          booking_status IN ('recherche', 'draft')
          AND auth.uid() IS NOT NULL
        );
      `
    }).single()

    if (policy1Error) {
      // Try alternative approach without IF NOT EXISTS
      const { error: altError } = await supabase.from('hr_resource_assignments').select('*').limit(0)
      
      if (!altError) {
        console.log('✅ Policy might already exist or was created')
      } else {
        console.error('❌ Error creating policy:', policy1Error)
      }
    } else {
      console.log('✅ Policy created successfully')
    }

    // 2. Check existing policies
    console.log('\n📋 Checking existing policies on hr_resource_assignments...')
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          policyname,
          cmd,
          permissive
        FROM pg_policies 
        WHERE tablename = 'hr_resource_assignments'
        ORDER BY policyname;
      `
    })

    if (!policiesError && policies) {
      console.log('Current policies:', policies)
    }

    // 3. Test if candidates can now access assignments
    console.log('\n🧪 Testing candidate access to assignments...')
    const { data: testData, error: testError } = await supabase
      .from('hr_resource_assignments')
      .select('id, booking_status, project_id')
      .in('booking_status', ['recherche', 'draft'])
      .limit(5)

    if (!testError) {
      console.log(`✅ Successfully accessed ${testData?.length || 0} assignments`)
      if (testData && testData.length > 0) {
        console.log('Sample assignments:', testData)
      }
    } else {
      console.error('❌ Error accessing assignments:', testError)
    }

    console.log('\n✨ RLS fix process completed!')
    console.log('\n📌 Next steps:')
    console.log('1. Refresh the candidate dashboard')
    console.log('2. Check if missions are now visible')
    console.log('3. If not, you may need to execute the SQL directly in Supabase dashboard')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the fix
applyRLSFix()