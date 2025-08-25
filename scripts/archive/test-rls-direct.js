import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egdelmcijszuapcpglsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U'
);

async function testRLS() {
  console.log('🔍 Test RLS avec anon key');
  
  const marketingProfileId = '922efb64-1684-45ec-8aea-436c4dad2f37';
  
  // Test 1: Assignments pour ce profile_id
  console.log('\n1. Test assignments pour profile_id:', marketingProfileId);
  const { data: assignments1, error: error1 } = await supabase
    .from('hr_resource_assignments')
    .select('id, profile_id, booking_status')
    .eq('profile_id', marketingProfileId);
    
  console.log('✅ Résultat:', assignments1?.length || 0, 'assignments');
  console.log('❌ Erreur:', error1);
  
  // Test 2: Tous les assignments (sample)
  console.log('\n2. Test tous les assignments (sample 5)');
  const { data: assignments2, error: error2 } = await supabase
    .from('hr_resource_assignments')
    .select('id, profile_id, booking_status')
    .limit(5);
    
  console.log('✅ Résultat:', assignments2?.length || 0, 'assignments');
  console.log('❌ Erreur:', error2);
  if (assignments2) {
    assignments2.forEach(a => {
      console.log(`  - ID: ${a.id} | Profile: ${a.profile_id} | Status: ${a.booking_status}`);
    });
  }
  
  // Test 3: Assignments avec status recherche
  console.log('\n3. Test assignments avec booking_status = recherche');
  const { data: assignments3, error: error3 } = await supabase
    .from('hr_resource_assignments')
    .select('id, profile_id, booking_status')
    .eq('booking_status', 'recherche')
    .limit(5);
    
  console.log('✅ Résultat:', assignments3?.length || 0, 'assignments recherche');
  console.log('❌ Erreur:', error3);
  
  // Test 4: Query complexe avec join projects
  console.log('\n4. Test query avec join projects');
  const { data: assignments4, error: error4 } = await supabase
    .from('hr_resource_assignments')
    .select(`
      id,
      profile_id,
      booking_status,
      projects(id, title, status)
    `)
    .eq('profile_id', marketingProfileId)
    .limit(3);
    
  console.log('✅ Résultat avec join:', assignments4?.length || 0, 'assignments');
  console.log('❌ Erreur join:', error4);
}

testRLS().catch(console.error);