#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://egdelmcijszuapcpglsy.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkConstraints() {
  console.log("🔍 Test des contraintes et de la structure");
  console.log("=" .repeat(50));

  try {
    // Générer un UUID valide
    const crypto = await import('crypto');
    const validUUID = crypto.randomUUID();
    
    console.log("📋 Test avec UUID valide:", validUUID);

    // Test 1: Insertion avec les colonnes basiques
    const basicData = {
      event_id: validUUID,
      email: "test@example.com"
    };

    console.log("🧪 Test 1 - Colonnes basiques:", basicData);
    const { data: data1, error: error1 } = await supabase
      .from('project_event_attendees')
      .insert([basicData])
      .select();

    if (error1) {
      console.log("❌ Test 1 échoué:", error1);
    } else {
      console.log("✅ Test 1 réussi:", data1);
      console.log("📋 Colonnes existantes dans la réponse:");
      if (data1 && data1[0]) {
        Object.keys(data1[0]).forEach(col => {
          console.log(`  - ${col}: ${data1[0][col]}`);
        });
      }
    }

    // Test 2: Insertion avec les colonnes TypeScript
    const fullData = {
      event_id: crypto.randomUUID(),
      email: "test2@example.com",
      required: true,
      response_status: 'pending'
    };

    console.log("\n🧪 Test 2 - Colonnes TypeScript:", fullData);
    const { data: data2, error: error2 } = await supabase
      .from('project_event_attendees')
      .insert([fullData])
      .select();

    if (error2) {
      console.log("❌ Test 2 échoué:", error2);
    } else {
      console.log("✅ Test 2 réussi:", data2);
    }

    // Test 3: Test upsert (pour voir si la contrainte unique existe)
    console.log("\n🧪 Test 3 - Test upsert:");
    const { data: data3, error: error3 } = await supabase
      .from('project_event_attendees')
      .upsert([basicData], { onConflict: 'event_id,email' })
      .select();

    if (error3) {
      console.log("❌ Test 3 échoué (contrainte manquante):", error3);
    } else {
      console.log("✅ Test 3 réussi (contrainte existe):", data3);
    }

    // Nettoyer les tests
    await supabase.from('project_event_attendees').delete().in('email', ['test@example.com', 'test2@example.com']);
    console.log("🧹 Tests nettoyés");

  } catch (error) {
    console.error("❌ Erreur générale:", error);
  }
}

checkConstraints();