#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCandidates() {
  console.log('📋 VÉRIFICATION DES CANDIDATS ET BANNIÈRE PROMO\n');
  console.log('=' .repeat(50) + '\n');
  
  const { data: candidates } = await supabase
    .from('candidate_profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (candidates && candidates.length > 0) {
    console.log(`${candidates.length} candidats trouvés:\n`);
    
    candidates.forEach((c, index) => {
      console.log(`${index + 1}. ${c.email}`);
      console.log(`   Prénom: ${c.first_name || 'Non défini'}`);
      console.log(`   Nom: ${c.last_name || 'Non défini'}`);
      console.log(`   Qualification: ${c.qualification_status || 'pending'}`);
      console.log(`   Onboarding Step: ${c.onboarding_step || 0}`);
      console.log(`   Séniorité: ${c.seniority || 'Non défini'}`);
      
      // Déterminer si la bannière doit s'afficher
      const showBanner = c.qualification_status !== 'qualified';
      
      if (showBanner) {
        console.log(`   🔴 BANNIÈRE VISIBLE: OUI - Le candidat doit passer le test`);
      } else {
        console.log(`   ✅ BANNIÈRE VISIBLE: NON - Le candidat est validé`);
      }
      
      console.log('   ---');
    });
    
    // Statistiques
    const qualified = candidates.filter(c => c.qualification_status === 'qualified').length;
    const pending = candidates.filter(c => !c.qualification_status || c.qualification_status === 'pending').length;
    const rejected = candidates.filter(c => c.qualification_status === 'rejected').length;
    
    console.log('\n📊 STATISTIQUES:');
    console.log(`   - Validés (qualified): ${qualified}`);
    console.log(`   - En attente (pending): ${pending}`);
    console.log(`   - Rejetés (rejected): ${rejected}`);
    console.log(`\n   → ${pending + rejected} candidats verront la bannière promo`);
    
  } else {
    console.log('❌ Aucun candidat trouvé dans la base');
  }
}

checkCandidates().catch(console.error);