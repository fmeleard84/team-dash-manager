#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function invokeValidationSystem() {
  console.log('🚀 Invocation du système de validation IA...');
  
  const response = await fetch('https://egdelmcijszuapcpglsy.supabase.co/functions/v1/apply-validation-system', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  console.log('📊 Réponse:', JSON.stringify(data, null, 2));
  
  if (data.success) {
    console.log('✅ Système de validation appliqué avec succès !');
    console.log(`   - ${data.stats.validated_candidates} candidats validés`);
    console.log(`   - ${data.stats.pending_candidates} candidats en attente`);
    console.log(`   - ${data.stats.total_checked} candidats vérifiés`);
  } else {
    console.error('❌ Erreur:', data.error);
  }
}

invokeValidationSystem().catch(console.error);