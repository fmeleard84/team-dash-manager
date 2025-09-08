#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://egdelmcijszuapcpglsy.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log("🔍 Debug de la structure project_event_attendees");
console.log("=" .repeat(60));

async function debugAttendeesStructure() {
  try {
    // Tester une simple lecture pour voir la structure attendue
    const { data: existingData, error: readError } = await supabase
      .from('project_event_attendees')
      .select('*')
      .limit(1);
    
    console.log("📊 Lecture existante:");
    console.log("Data:", existingData);
    console.log("Error:", readError);

    // Essayer d'insérer avec les mêmes données que le code
    const testAttendee = {
      event_id: "test-event-id",
      email: "test@example.com",
      required: true,
      response_status: 'pending'
    };

    console.log("\n📤 Test d'insertion avec:", testAttendee);
    
    const { data: insertData, error: insertError } = await supabase
      .from('project_event_attendees')
      .insert([testAttendee])
      .select();
    
    console.log("Insert Data:", insertData);
    console.log("Insert Error:", insertError);

    // Si ça marche pas, essayer sans certains champs
    if (insertError) {
      console.log("\n🔄 Test sans 'required':");
      const testWithoutRequired = {
        event_id: "test-event-id-2",
        email: "test2@example.com",
        response_status: 'pending'
      };

      const { data: insertData2, error: insertError2 } = await supabase
        .from('project_event_attendees')
        .insert([testWithoutRequired])
        .select();
      
      console.log("Insert Data 2:", insertData2);
      console.log("Insert Error 2:", insertError2);
    }

  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

debugAttendeesStructure();