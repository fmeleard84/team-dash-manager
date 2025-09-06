import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testProjectStatus() {
  console.log('🧪 Testing project status functionality...\n')

  try {
    // 1. Check current status distribution
    console.log('📊 Current project status distribution:')
    const { data: projects, error: fetchError } = await supabase
      .from('projects')
      .select('status')
    
    if (fetchError) {
      console.error('Error fetching projects:', fetchError)
      return
    }

    const statusCount = projects.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1
      return acc
    }, {})

    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} projects`)
    })

    // 2. Test the fix-project-status-constraint function
    console.log('\n🔧 Calling fix-project-status-constraint function...')
    const { data: fixResult, error: fixError } = await supabase.functions.invoke(
      'fix-project-status-constraint',
      { body: {} }
    )

    if (fixError) {
      console.error('Error calling function:', fixError)
    } else {
      console.log('✅ Function result:', JSON.stringify(fixResult, null, 2))
    }

    // 3. Check if attente-team status works
    console.log('\n🧪 Testing attente-team status...')
    
    // Get a test project
    const { data: testProject } = await supabase
      .from('projects')
      .select('id, name, status')
      .limit(1)
      .single()

    if (testProject) {
      console.log(`  Testing with project: ${testProject.name} (${testProject.id})`)
      console.log(`  Current status: ${testProject.status}`)
      
      // Try to update to attente-team
      const { error: updateError } = await supabase
        .from('projects')
        .update({ status: 'attente-team' })
        .eq('id', testProject.id)
      
      if (updateError) {
        console.error('  ❌ Failed to set attente-team status:', updateError.message)
      } else {
        console.log('  ✅ Successfully set status to attente-team')
        
        // Revert the change
        await supabase
          .from('projects')
          .update({ status: testProject.status })
          .eq('id', testProject.id)
        
        console.log(`  ↩️ Reverted to original status: ${testProject.status}`)
      }
    }

    // 4. Test all valid statuses
    console.log('\n📋 Testing all documented statuses:')
    const validStatuses = ['pause', 'attente-team', 'play', 'completed']
    
    for (const status of validStatuses) {
      const { error } = await supabase
        .from('projects')
        .select('id')
        .eq('status', status)
        .limit(1)
      
      if (error) {
        console.log(`  ❌ ${status}: Error - ${error.message}`)
      } else {
        console.log(`  ✅ ${status}: Works correctly`)
      }
    }

    console.log('\n✨ Test completed!')

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

testProjectStatus()