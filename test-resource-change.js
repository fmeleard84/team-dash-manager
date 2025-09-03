import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ1NzkzMTgsImV4cCI6MjA0MDE1NTMxOH0.YHPbEKGbr6S5UFPMepLQzIcgYPvktaJguXsuKPPCLU4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFunction() {
  try {
    // Test data that matches what's being sent
    const testData = {
      assignmentId: '3dde18ed-5be7-4f41-86ee-6e8d66551924',
      oldData: {
        project_id: '3e1ea2d9-c2ca-459e-8fef-374dc92e7acd',
        profile_id: '86591b70-f8ba-4d3d-8ff0-8e92ddfd2f3e',
        seniority: 'intermediate',
        languages: ['Français'],
        expertises: [],
        booking_status: 'accepted'
      },
      newData: {
        project_id: '3e1ea2d9-c2ca-459e-8fef-374dc92e7acd',
        profile_id: '86591b70-f8ba-4d3d-8ff0-8e92ddfd2f3e',
        seniority: 'junior',
        languages: ['Français'],
        expertises: [],
        booking_status: 'accepted',
        calculated_price: 50,
        node_data: {}
      }
    };

    console.log('🔧 Testing handle-resource-change with:', testData);

    const { data, error } = await supabase.functions.invoke('handle-resource-change', {
      body: testData
    });

    if (error) {
      console.error('❌ Error:', error);
      console.error('Error details:', error.message);
      if (error.context) {
        console.error('Context:', error.context);
      }
    } else {
      console.log('✅ Success:', data);
    }

  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }
}

testFunction();