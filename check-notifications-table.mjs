import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Ula2V5IiwiZXhwIjoxOTgzODEyOTk2fQ.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNotificationTables() {
  console.log('=== Checking notification-related tables ===\n');
  
  // Check if notifications table exists
  try {
    const { data: notificationsData, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);
      
    if (notifError) {
      console.log('❌ Table "notifications":', notifError.message);
    } else {
      console.log('✅ Table "notifications" exists');
      console.log('Sample data:', notificationsData);
    }
  } catch (e) {
    console.log('❌ Error checking notifications table:', e.message);
  }
  
  // Check candidate_notifications
  try {
    const { data: candidateNotif, error: candidateError } = await supabase
      .from('candidate_notifications')
      .select('*')
      .limit(1);
      
    if (!candidateError) {
      console.log('✅ Table "candidate_notifications" exists');
    }
  } catch (e) {
    console.log('Error with candidate_notifications:', e.message);
  }
  
  // Check notification_center table (seen in components)
  try {
    const { data: notifCenter, error: centerError } = await supabase
      .from('notification_center')
      .select('*')
      .limit(1);
      
    if (!centerError) {
      console.log('✅ Table "notification_center" exists');
    } else {
      console.log('❌ Table "notification_center":', centerError.message);
    }
  } catch (e) {
    console.log('Error with notification_center:', e.message);
  }
}

checkNotificationTables().catch(console.error);
