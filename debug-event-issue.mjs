#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://egdelmcijszuapcpglsy.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugEventIssue() {
  console.log("🔍 Debug problème événement");
  console.log("=" .repeat(40));

  // Test de création d'UUID
  const crypto = await import('crypto');
  const testUuid = crypto.randomUUID();
  console.log("📋 UUID de test généré:", testUuid, "Type:", typeof testUuid);

  // Test insertion directe avec UUID généré
  const testAttendee = {
    event_id: testUuid,
    email: "test@example.com", 
    response_status: 'pending'
  };

  console.log("📤 Test insertion avec UUID généré:", testAttendee);

  const { data: result1, error: error1 } = await supabase
    .from('project_event_attendees')
    .insert([testAttendee])
    .select();

  if (error1) {
    console.log("❌ Erreur avec UUID généré:", error1);
  } else {
    console.log("✅ Succès avec UUID généré:", result1);
    // Nettoyer
    await supabase.from('project_event_attendees').delete().eq('event_id', testUuid);
  }

  // Test avec le pattern exact du code CreateEventDialog
  const mockEvent = { id: crypto.randomUUID() };
  const attendees = ["test@example.com"].map(email => ({
    event_id: mockEvent.id,
    email,
    required: true,
    response_status: 'pending'
  }));

  console.log("📤 Test avec pattern CreateEventDialog:", attendees);

  const { data: result2, error: error2 } = await supabase
    .from('project_event_attendees')
    .insert(attendees)
    .select();

  if (error2) {
    console.log("❌ Erreur avec pattern CreateEventDialog:", error2);
  } else {
    console.log("✅ Succès avec pattern CreateEventDialog:", result2);
    // Nettoyer
    if (result2 && result2.length > 0) {
      await supabase.from('project_event_attendees').delete().eq('event_id', mockEvent.id);
    }
  }

  // Test sans le champ 'required'
  const attendeesNoRequired = ["test2@example.com"].map(email => ({
    event_id: crypto.randomUUID(),
    email,
    response_status: 'pending'
  }));

  console.log("📤 Test sans 'required':", attendeesNoRequired);

  const { data: result3, error: error3 } = await supabase
    .from('project_event_attendees')
    .insert(attendeesNoRequired)
    .select();

  if (error3) {
    console.log("❌ Erreur sans 'required':", error3);
  } else {
    console.log("✅ Succès sans 'required':", result3);
    // Nettoyer  
    if (result3 && result3.length > 0) {
      await supabase.from('project_event_attendees').delete().eq('event_id', attendeesNoRequired[0].event_id);
    }
  }
}

debugEventIssue();