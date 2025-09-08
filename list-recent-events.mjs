import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function listRecentEvents() {
  console.log("📅 Liste des événements créés aujourd'hui...")
  
  // Récupérer tous les événements créés aujourd'hui
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { data: events, error } = await supabase
    .from('project_events')
    .select(`
      id,
      title,
      start_at,
      created_at,
      created_by,
      project_event_attendees(*)
    `)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error("❌ Erreur:", error)
    return
  }
  
  if (!events || events.length === 0) {
    console.log("⚠️ Aucun événement créé aujourd'hui")
    
    // Chercher les 10 derniers événements
    const { data: recentEvents } = await supabase
      .from('project_events')
      .select(`
        id,
        title,
        start_at,
        created_at,
        created_by,
        project_event_attendees(*)
      `)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (recentEvents && recentEvents.length > 0) {
      console.log("\n📅 10 derniers événements:")
      displayEvents(recentEvents)
    }
  } else {
    displayEvents(events)
  }
}

function displayEvents(events) {
  events.forEach((event, index) => {
    const startDate = new Date(event.start_at)
    const createDate = new Date(event.created_at)
    
    console.log(`\n${index + 1}. "${event.title}"`)
    console.log(`   📅 Prévu le: ${startDate.toLocaleDateString('fr-FR')} à ${startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`)
    console.log(`   🆔 ID: ${event.id}`)
    console.log(`   ⏰ Créé le: ${createDate.toLocaleString('fr-FR')}`)
    console.log(`   👤 Créé par: ${event.created_by}`)
    
    if (event.project_event_attendees && event.project_event_attendees.length > 0) {
      console.log(`   ✅ ${event.project_event_attendees.length} participant(s):`)
      event.project_event_attendees.forEach(a => {
        console.log(`      • ${a.email} (${a.response_status})`)
      })
    } else {
      console.log(`   ⚠️ AUCUN participant enregistré`)
    }
  })
}

listRecentEvents().catch(console.error)