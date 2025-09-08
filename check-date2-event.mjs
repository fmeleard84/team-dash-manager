import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function checkDate2Event() {
  console.log("🔍 Recherche de l'événement 'Date2' du 24 septembre...")
  
  // 1. Chercher l'événement Date2
  const { data: events, error: eventError } = await supabase
    .from('project_events')
    .select('*')
    .ilike('title', '%Date2%')
    .gte('start_at', '2025-09-24T00:00:00')
    .lte('start_at', '2025-09-24T23:59:59')
  
  if (eventError) {
    console.error("❌ Erreur recherche événement:", eventError)
    return
  }
  
  if (!events || events.length === 0) {
    console.log("⚠️ Aucun événement 'Date2' trouvé le 24 septembre")
    
    // Chercher tous les événements récents avec "date" dans le titre
    const { data: recentEvents } = await supabase
      .from('project_events')
      .select('id, title, start_at, created_at')
      .ilike('title', '%date%')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (recentEvents && recentEvents.length > 0) {
      console.log("\n📅 Événements récents avec 'date' dans le titre:")
      recentEvents.forEach(e => {
        const startDate = new Date(e.start_at)
        console.log(`  - ${e.title} (${startDate.toLocaleDateString('fr-FR')}) - ID: ${e.id}`)
      })
    }
    return
  }
  
  // Pour chaque événement trouvé
  for (const event of events) {
    console.log(`\n✅ Événement trouvé: "${event.title}"`)
    console.log(`  📅 Date: ${new Date(event.start_at).toLocaleString('fr-FR')}`)
    console.log(`  🆔 ID: ${event.id}`)
    console.log(`  👤 Créé par: ${event.created_by}`)
    
    // 2. Vérifier les participants dans project_event_attendees
    const { data: attendees, error: attendeesError } = await supabase
      .from('project_event_attendees')
      .select('*')
      .eq('event_id', event.id)
    
    if (attendeesError) {
      console.error("  ❌ Erreur récupération participants:", attendeesError)
    } else if (!attendees || attendees.length === 0) {
      console.log("  ⚠️ AUCUN PARTICIPANT enregistré pour cet événement!")
    } else {
      console.log(`  ✅ ${attendees.length} participant(s) enregistré(s):`)
      attendees.forEach(a => {
        console.log(`    • ${a.email} (ID: ${a.id}, Status: ${a.response_status})`)
      })
    }
    
    // 3. Vérifier avec jointure (comme le fait ViewEventDialog)
    const { data: eventWithAttendees } = await supabase
      .from('project_events')
      .select(`
        id,
        title,
        project_event_attendees(*)
      `)
      .eq('id', event.id)
      .single()
    
    if (eventWithAttendees) {
      console.log(`\n  📊 Vérification avec jointure:`)
      console.log(`    - Participants via jointure: ${eventWithAttendees.project_event_attendees?.length || 0}`)
    }
    
    // 4. Vérifier le projet associé
    const { data: project } = await supabase
      .from('projects')
      .select('id, title, owner_id')
      .eq('id', event.project_id)
      .single()
    
    if (project) {
      console.log(`\n  📁 Projet: ${project.title} (ID: ${project.id})`)
      
      // 5. Vérifier les membres du projet
      const { data: assignments } = await supabase
        .from('hr_resource_assignments')
        .select(`
          candidate_id,
          booking_status,
          candidate_profiles (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq('project_id', project.id)
        .eq('booking_status', 'accepted')
      
      if (assignments && assignments.length > 0) {
        console.log(`  👥 Membres du projet (acceptés):`)
        assignments.forEach(a => {
          if (a.candidate_profiles) {
            console.log(`    • ${a.candidate_profiles.email} (${a.candidate_profiles.first_name} ${a.candidate_profiles.last_name})`)
          }
        })
      }
    }
  }
}

checkDate2Event().catch(console.error)