import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI1OTM4NzQsImV4cCI6MjAzODE2OTg3NH0.V46sINZHShqwFD5fP0xEA2ZDBE4qziqVQJJzubQD0ZE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixCandidates() {
  console.log('🔧 Vérification et correction des candidats...\n');

  try {
    // Appeler la fonction Edge
    const { data, error } = await supabase.functions.invoke('check-and-fix-candidates', {
      body: {}
    });

    if (error) {
      throw error;
    }

    console.log('✅ Résultats:\n');
    
    if (data) {
      console.log('📊 Assignations trouvées:', data.assignments_found);
      
      if (data.candidates_checked?.length > 0) {
        console.log('\n✅ Candidats vérifiés:');
        data.candidates_checked.forEach(c => {
          console.log(`   - ${c.name} (${c.email}) - ${c.status}`);
        });
      }
      
      if (data.fixes_applied?.length > 0) {
        console.log('\n🔧 Corrections appliquées:');
        data.fixes_applied.forEach(fix => {
          console.log(`   - ${fix.type}: ${fix.email || fix.candidate_id}`);
        });
      } else {
        console.log('\n✅ Aucune correction nécessaire');
      }
      
      if (data.final_state) {
        console.log('\n📋 État final des assignations:');
        data.final_state.forEach(a => {
          const status = a.has_candidate_id ? '✅' : '❌';
          const email = a.candidate_email || a.hr_profile_name || 'Unknown';
          console.log(`   ${status} ${email} (Status: ${a.booking_status})`);
        });
      }
    }

    console.log('\n✨ Maintenant, rechargez la page pour voir tous les membres!');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    console.log('\n💡 Si l\'erreur persiste, vérifiez les logs de la fonction Edge');
  }
}

fixCandidates();