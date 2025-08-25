import { createClient } from '@supabase/supabase-js';

// Service role pour bypass RLS
const serviceClient = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.hJfYoZR5hzx1N31oUeQNJTZNt5iO9kI56JhE_VlOsO8'
);

// Anon client
const anonClient = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
);

async function testRLSDisable() {
  console.log('🔧 Test complet RLS et données');
  
  try {
    // 1. Vérifier les données avec service role
    console.log('\n1. Test avec SERVICE ROLE:');
    const { data: serviceData, error: serviceError } = await serviceClient
      .from('hr_resource_assignments')
      .select('id, profile_id, booking_status')
      .limit(5);
      
    console.log('✅ Service role trouve:', serviceData?.length || 0, 'assignments');
    if (serviceError) console.error('❌ Erreur service:', serviceError);
    
    if (serviceData && serviceData.length > 0) {
      serviceData.forEach(a => {
        console.log(`  - ${a.id} | Profile: ${a.profile_id} | Status: ${a.booking_status}`);
      });
    }
    
    // 2. Désactiver RLS temporairement
    console.log('\n2. Désactivation temporaire RLS...');
    const { data: disableResult, error: disableError } = await serviceClient
      .rpc('exec_sql', {
        sql: 'ALTER TABLE hr_resource_assignments DISABLE ROW LEVEL SECURITY;'
      });
      
    console.log('✅ Disable RLS result:', disableResult);
    if (disableError) console.error('❌ Erreur disable:', disableError);
    
    // 3. Test avec anon après désactivation
    console.log('\n3. Test avec ANON après désactivation RLS:');
    const { data: anonData, error: anonError } = await anonClient
      .from('hr_resource_assignments')
      .select('id, profile_id, booking_status')
      .limit(5);
      
    console.log('✅ Anon trouve:', anonData?.length || 0, 'assignments');
    if (anonError) console.error('❌ Erreur anon:', anonError);
    
    // 4. Réactiver RLS avec politique permissive
    console.log('\n4. Réactivation RLS avec politique permissive...');
    const { data: enableResult, error: enableError } = await serviceClient
      .rpc('exec_sql', {
        sql: `
          ALTER TABLE hr_resource_assignments ENABLE ROW LEVEL SECURITY;
          
          DROP POLICY IF EXISTS "permit_all_reads" ON hr_resource_assignments;
          CREATE POLICY "permit_all_reads" ON hr_resource_assignments FOR SELECT USING (true);
        `
      });
      
    console.log('✅ Enable RLS result:', enableResult);
    if (enableError) console.error('❌ Erreur enable:', enableError);
    
    // 5. Test final avec anon
    console.log('\n5. Test FINAL avec ANON:');
    const { data: finalData, error: finalError } = await anonClient
      .from('hr_resource_assignments')
      .select('id, profile_id, booking_status')
      .limit(5);
      
    console.log('✅ Final anon trouve:', finalData?.length || 0, 'assignments');
    if (finalError) console.error('❌ Erreur final:', finalError);
    
  } catch (error) {
    console.error('💥 Erreur globale:', error);
  }
}

testRLSDisable();