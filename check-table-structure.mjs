#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://egdelmcijszuapcpglsy.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTableStructure() {
  console.log("🔍 Vérification de la structure de project_event_attendees");
  console.log("=" .repeat(60));

  try {
    // Tester une lecture simple pour voir les colonnes disponibles
    const { data, error } = await supabase
      .from('project_event_attendees')
      .select('*')
      .limit(1);

    if (error) {
      console.error("❌ Erreur lecture table:", error);
      return;
    }

    console.log("📊 Données actuelles dans la table:");
    console.log("Data:", data);

    if (data && data.length > 0) {
      console.log("\n📋 Colonnes détectées:");
      Object.keys(data[0]).forEach(col => {
        console.log(`  - ${col}: ${typeof data[0][col]} (${data[0][col]})`);
      });
    } else {
      console.log("📋 Table vide, testons l'insertion...");
      
      // Test d'insertion simple pour voir les colonnes acceptées
      const testData = {
        event_id: "test-uuid-" + Date.now(),
        email: "test@example.com"
      };

      const { data: insertData, error: insertError } = await supabase
        .from('project_event_attendees')
        .insert([testData])
        .select();

      if (insertError) {
        console.log("❌ Erreur test insertion:", insertError);
        console.log("💡 Cela nous indique quelles colonnes sont attendues");
      } else {
        console.log("✅ Test insertion réussi:", insertData);
        // Nettoyer
        await supabase.from('project_event_attendees').delete().eq('email', 'test@example.com');
      }
    }

  } catch (error) {
    console.error("❌ Erreur générale:", error);
  }
}

checkTableStructure();