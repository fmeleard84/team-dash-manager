import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, anonKey);

async function testAccept() {
  console.log('Testing accept mission...');
  
  const assignmentId = 'cc2bff24-4dea-4ab0-90cf-184849031ced';
  
  // First check the assignment status
  const { data: assignment, error: checkError } = await supabase
    .from('hr_resource_assignments')
    .select('*')
    .eq('id', assignmentId)
    .single();
  
  if (checkError) {
    console.log('Error checking assignment:', checkError.message);
    return;
  }
  
  console.log('Assignment current status:', assignment?.booking_status);
  console.log('Assignment details:', assignment);
  
  // Try to call the function
  const { data, error } = await supabase.functions.invoke('resource-booking', {
    body: {
      action: 'accept_mission',
      assignment_id: assignmentId,
      candidate_email: 'test@example.com'
    }
  });
  
  if (error) {
    console.log('Function error:', error.message);
    
    // Try to get more details
    if (error.context?.body) {
      try {
        const errorBody = await error.context.json();
        console.log('Error details:', errorBody);
      } catch (e) {
        console.log('Could not parse error body');
      }
    }
  } else {
    console.log('Success:', data);
  }
}

testAccept();