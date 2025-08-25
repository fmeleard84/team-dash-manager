#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSeniorityEnum() {
  console.log('🔍 Vérification des valeurs de séniorité acceptées\n');
  
  // Tester les différentes valeurs
  const testValues = ['junior', 'intermediate', 'medior', 'senior', 'expert'];
  
  for (const value of testValues) {
    // Essayer de récupérer un candidat avec cette séniorité
    const { data, error } = await supabase
      .from('candidate_profiles')
      .select('seniority')
      .eq('seniority', value)
      .limit(1);
      
    if (error && error.message.includes('invalid input value')) {
      console.log(`❌ "${value}" - NON accepté`);
    } else {
      console.log(`✅ "${value}" - Accepté`);
    }
  }
  
  // Récupérer les valeurs actuelles
  console.log('\n📊 Valeurs de séniorité actuellement utilisées:');
  const { data: candidates } = await supabase
    .from('candidate_profiles')
    .select('seniority')
    .not('seniority', 'is', null);
    
  const uniqueValues = [...new Set(candidates?.map(c => c.seniority))];
  console.log('Valeurs trouvées:', uniqueValues.length > 0 ? uniqueValues : 'Aucune');
}

checkSeniorityEnum().catch(console.error);