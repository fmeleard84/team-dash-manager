import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ""

// Si pas de clé service, utiliser la clé anon
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY)

async function debugEventAttendees() {
  console.log("🔍 Diagnostic des participants d'événements")
  
  // Récupérer les derniers événements créés
  const eventId = "42818be9-2e69-40a7-bd31-709c3ccd1f47" // ID de l'événement "date" créé dans les logs
  
  console.log(`\n📅 Vérification de l'événement ${eventId}`)
  
  // 1. Vérifier l'événement
  const { data: event, error: eventError } = await supabase
    .from('project_events')
    .select('*')
    .eq('id', eventId)
    .single()
  
  if (eventError) {
    console.error("❌ Erreur récupération événement:", eventError)
  } else {
    console.log("✅ Événement trouvé:", event.title)
  }
  
  // 2. Vérifier les participants directement
  console.log("\n👥 Vérification des participants...")
  const { data: attendees, error: attendeesError } = await supabase
    .from('project_event_attendees')
    .select('*')
    .eq('event_id', eventId)
  
  if (attendeesError) {
    console.error("❌ Erreur récupération participants:", attendeesError)
  } else if (!attendees || attendees.length === 0) {
    console.log("⚠️ Aucun participant trouvé pour cet événement")
    
    // Essayer d'insérer manuellement
    console.log("\n🧪 Tentative d'insertion manuelle...")
    const { data: insertData, error: insertError } = await supabase
      .from('project_event_attendees')
      .insert([
        {
          event_id: eventId,
          email: "fmeleard+clienr_1119@gmail.com",
          required: true,
          response_status: 'pending'
        },
        {
          event_id: eventId,
          email: "fmeleard+new_cdp_id4@gmail.com",
          required: true,
          response_status: 'pending'
        }
      ])
      .select()
    
    if (insertError) {
      console.error("❌ Erreur insertion:", insertError)
      console.error("Message:", insertError.message)
      console.error("Code:", insertError.code)
      console.error("Details:", insertError.details)
    } else {
      console.log("✅ Participants insérés:", insertData)
    }
  } else {
    console.log(`✅ ${attendees.length} participant(s) trouvé(s):`)
    attendees.forEach(a => {
      console.log(`  - ${a.email} (status: ${a.response_status}, id: ${a.id})`)
    })
  }
  
  // 3. Vérifier avec jointure
  console.log("\n🔗 Vérification avec jointure...")
  const { data: eventWithAttendees, error: joinError } = await supabase
    .from('project_events')
    .select(`
      id,
      title,
      project_event_attendees(*)
    `)
    .eq('id', eventId)
    .single()
  
  if (joinError) {
    console.error("❌ Erreur jointure:", joinError)
  } else {
    console.log("📋 Événement avec participants:")
    console.log("  - Titre:", eventWithAttendees.title)
    console.log("  - Participants:", eventWithAttendees.project_event_attendees?.length || 0)
    if (eventWithAttendees.project_event_attendees?.length > 0) {
      eventWithAttendees.project_event_attendees.forEach(a => {
        console.log(`    • ${a.email}`)
      })
    }
  }
}

debugEventAttendees().catch(console.error)