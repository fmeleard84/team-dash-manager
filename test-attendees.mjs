import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testAttendees() {
  console.log("🔍 Test des participants d'événements")
  
  // 1. Récupérer un événement récent
  const { data: events, error: eventError } = await supabase
    .from('project_events')
    .select('id, title, project_event_attendees(*)')
    .order('created_at', { ascending: false })
    .limit(1)
  
  if (eventError) {
    console.error("❌ Erreur récupération événement:", eventError)
    return
  }
  
  if (!events || events.length === 0) {
    console.log("⚠️ Aucun événement trouvé")
    return
  }
  
  const event = events[0]
  console.log("\n📅 Événement:", event.title, "(ID:", event.id, ")")
  console.log("👥 Participants actuels:", event.project_event_attendees)
  
  // 2. Tester l'insertion directe
  console.log("\n🧪 Test d'insertion directe...")
  
  const testEmail = `test-${Date.now()}@example.com`
  const { data: insertData, error: insertError } = await supabase
    .from('project_event_attendees')
    .insert({
      event_id: event.id,
      email: testEmail,
      required: true,
      response_status: 'pending'
    })
    .select()
  
  if (insertError) {
    console.error("❌ Erreur insertion directe:", insertError)
  } else {
    console.log("✅ Insertion réussie:", insertData)
  }
  
  // 3. Vérifier si l'insertion est visible
  const { data: checkData, error: checkError } = await supabase
    .from('project_event_attendees')
    .select('*')
    .eq('event_id', event.id)
  
  if (checkError) {
    console.error("❌ Erreur vérification:", checkError)
  } else {
    console.log("\n📋 Tous les participants après insertion:")
    checkData.forEach(p => {
      console.log(`  - ${p.email} (status: ${p.response_status})`)
    })
  }
  
  // 4. Nettoyer le test
  if (!insertError) {
    await supabase
      .from('project_event_attendees')
      .delete()
      .eq('email', testEmail)
    console.log("\n🧹 Données de test nettoyées")
  }
}

testAttendees().catch(console.error)