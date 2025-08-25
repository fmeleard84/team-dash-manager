import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI2MDMzNzYsImV4cCI6MjAzODE3OTM3Nn0.B3z3YV65vw3ckLltF94qRT8KHw8XMsQx0T0gs94vxoQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixStuckTimer() {
  const email = 'fmeleard+ressource_2@gmail.com';
  
  console.log('🔧 Fixing stuck timer for:', email);
  
  try {
    // Get candidate profile
    const { data: candidateProfile, error: profileError } = await supabase
      .from('candidate_profiles')
      .select('id, first_name, last_name')
      .eq('email', email)
      .single();
    
    if (profileError || !candidateProfile) {
      console.error('❌ Candidate profile not found:', profileError);
      return;
    }
    
    console.log('✅ Found candidate:', candidateProfile.first_name, candidateProfile.last_name, '(ID:', candidateProfile.id, ')');
    
    // Get active tracking sessions
    const { data: activeSessions, error: activeError } = await supabase
      .from('active_time_tracking')
      .select('*')
      .eq('candidate_id', candidateProfile.id);
    
    if (activeError) {
      console.error('❌ Error fetching active sessions:', activeError);
      return;
    }
    
    console.log('📊 Active sessions found:', activeSessions?.length || 0);
    
    if (activeSessions && activeSessions.length > 0) {
      // Delete all active sessions
      const { error: deleteError } = await supabase
        .from('active_time_tracking')
        .delete()
        .eq('candidate_id', candidateProfile.id);
      
      if (deleteError) {
        console.error('❌ Error deleting active sessions:', deleteError);
        return;
      }
      
      console.log('✅ Deleted active tracking sessions');
      
      // Also mark any active time_tracking_sessions as completed
      const { data: incompleteSessions, error: fetchError } = await supabase
        .from('time_tracking_sessions')
        .select('id')
        .eq('candidate_id', candidateProfile.id)
        .in('status', ['active', 'paused']);
      
      if (incompleteSessions && incompleteSessions.length > 0) {
        console.log('📝 Found incomplete sessions:', incompleteSessions.length);
        
        for (const session of incompleteSessions) {
          const { error: updateError } = await supabase
            .from('time_tracking_sessions')
            .update({
              status: 'completed',
              end_time: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', session.id);
          
          if (updateError) {
            console.error('❌ Error updating session:', updateError);
          } else {
            console.log('✅ Marked session as completed:', session.id);
          }
        }
      }
    } else {
      console.log('ℹ️ No active sessions to clean');
    }
    
    console.log('✨ Timer fixed! You can now start a new timer.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixStuckTimer();