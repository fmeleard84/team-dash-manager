import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  try {
    // Récupérer un enregistrement pour voir sa structure
    const { data, error } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching assignment:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Colonnes disponibles dans hr_resource_assignments:');
      console.log(Object.keys(data[0]));
      
      console.log('\n📋 Exemple de données:');
      console.log(JSON.stringify(data[0], null, 2));
      
      // Vérifier spécifiquement les colonnes qui nous intéressent
      const columnsToCheck = ['completed_at', 'completion_reason', 'previous_assignment_id'];
      console.log('\n🔍 Vérification des colonnes de tracking:');
      columnsToCheck.forEach(col => {
        if (data[0].hasOwnProperty(col)) {
          console.log(`  ✅ ${col}: EXISTS`);
        } else {
          console.log(`  ❌ ${col}: MISSING`);
        }
      });
    } else {
      console.log('No data found in hr_resource_assignments');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkColumns();