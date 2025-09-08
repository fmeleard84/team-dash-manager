#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://egdelmcijszuapcpglsy.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log("🧪 Test création d'événement réel");
console.log("=" .repeat(50));

async function testEventCreation() {
  try {
    // Trouver un projet existant
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, title')
      .limit(1);

    if (projectError) {
      console.error("❌ Erreur récupération projet:", projectError);
      return;
    }

    if (!projects || projects.length === 0) {
      console.log("❌ Aucun projet trouvé");
      return;
    }

    const project = projects[0];
    console.log("📋 Projet utilisé:", project);

    // Créer un événement test
    const testEvent = {
      project_id: project.id,
      title: "Test Event Debug",
      description: "Test pour déboguer",
      start_at: new Date().toISOString(),
      end_at: new Date(Date.now() + 3600000).toISOString(),
      created_by: "test-user-id"
    };

    console.log("📤 Création événement:", testEvent);

    const { data: event, error: eventError } = await supabase
      .from('project_events')
      .insert([testEvent])
      .select()
      .single();

    if (eventError) {
      console.error("❌ Erreur création événement:", eventError);
      return;
    }

    console.log("✅ Événement créé:", event);
    console.log("📋 ID de l'événement:", event.id, "Type:", typeof event.id);

    // Tester l'insertion d'attendees
    if (event && event.id) {
      const testAttendee = {
        event_id: event.id,
        email: "test@example.com",
        response_status: 'pending'
      };

      console.log("📤 Test insertion attendee:", testAttendee);

      const { data: attendeeData, error: attendeeError } = await supabase
        .from('project_event_attendees')
        .insert([testAttendee])
        .select();

      if (attendeeError) {
        console.error("❌ Erreur insertion attendee:", attendeeError);
      } else {
        console.log("✅ Attendee inséré:", attendeeData);
      }

      // Nettoyer le test
      await supabase.from('project_event_attendees').delete().eq('event_id', event.id);
      await supabase.from('project_events').delete().eq('id', event.id);
      console.log("🧹 Test nettoyé");
    }

  } catch (error) {
    console.error("❌ Erreur générale:", error);
  }
}

testEventCreation();