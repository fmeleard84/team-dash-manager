import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzkwNTc5OX0.7LBnJqMrt4WbmL6qUcH0jzVJnCw-9nu0sGQYu1u6wLg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testEmailSending() {
  console.log('🔧 Testing email sending to fmeleard+dev@gmail.com...');

  try {
    // Invoke the edge function directly
    const { data, error } = await supabase.functions.invoke('send-team-member-invite', {
      body: {
        memberEmail: 'fmeleard+dev@gmail.com',
        memberName: 'Test User',
        clientName: 'Test Company',
        clientId: '5023aaa3-5b14-469c-9e05-b011705c7f55', // Your user ID
        memberId: 'test-member-' + Date.now(),
        jobTitle: 'Développeur Full Stack'
      }
    });

    if (error) {
      console.error('❌ Error invoking function:', error);
      return;
    }

    console.log('✅ Response from edge function:', data);
    
    if (data?.success) {
      console.log('✅ Email sent successfully!');
      console.log('Email ID:', data.emailId);
      console.log('Invitation token:', data.invitationToken);
    } else if (data?.emailError) {
      console.log('⚠️ Member created but email failed:', data.emailError);
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testEmailSending();