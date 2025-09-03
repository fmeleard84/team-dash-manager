import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkActivities() {
  console.log('🔍 Analyse du système d\'activités\n');
  console.log('===============================\n');
  
  try {
    // 1. Vérifier les tables existantes pour les activités
    console.log('📊 1. Tables liées aux activités:\n');
    
    // Check time_tracking_sessions
    const { data: timeSessions, error: timeError } = await supabase
      .from('time_tracking_sessions')
      .select('*')
      .limit(5);
    
    if (!timeError) {
      console.log(`✅ time_tracking_sessions: ${timeSessions?.length || 0} entrées trouvées`);
      if (timeSessions?.length > 0) {
        console.log('   Exemple:', JSON.stringify(timeSessions[0], null, 2));
      }
    } else {
      console.log('❌ time_tracking_sessions:', timeError.message);
    }
    
    // Check activity_logs (si existe)
    const { data: activityLogs, error: activityError } = await supabase
      .from('activity_logs')
      .select('*')
      .limit(5);
    
    if (!activityError) {
      console.log(`✅ activity_logs: ${activityLogs?.length || 0} entrées trouvées`);
    } else {
      console.log('❌ activity_logs: Table n\'existe pas ou erreur');
    }
    
    // Check project_activities (si existe)
    const { data: projectActivities, error: projActError } = await supabase
      .from('project_activities')
      .select('*')
      .limit(5);
    
    if (!projActError) {
      console.log(`✅ project_activities: ${projectActivities?.length || 0} entrées trouvées`);
    } else {
      console.log('❌ project_activities: Table n\'existe pas ou erreur');
    }
    
    // 2. Vérifier spécifiquement pour le candidat CDP FM 2708
    console.log('\n📋 2. Activités du candidat CDP FM 2708:\n');
    
    const { data: candidate } = await supabase
      .from('candidate_profiles')
      .select('id, first_name, last_name')
      .eq('first_name', 'CDP FM 2708')
      .single();
    
    if (candidate) {
      console.log(`Candidat trouvé: ${candidate.first_name} ${candidate.last_name} (ID: ${candidate.id})`);
      
      // Check time tracking sessions for this candidate
      const { data: candidateSessions, error: sessError } = await supabase
        .from('time_tracking_sessions')
        .select(`
          *,
          projects (
            title
          )
        `)
        .eq('candidate_id', candidate.id);
      
      if (!sessError) {
        console.log(`\n📊 Sessions de time tracking: ${candidateSessions?.length || 0}`);
        if (candidateSessions?.length > 0) {
          candidateSessions.forEach(session => {
            console.log(`   - Projet: ${session.projects?.title || 'N/A'}`);
            console.log(`     Activité: ${session.activity_description || 'N/A'}`);
            console.log(`     Status: ${session.status}`);
            console.log(`     Durée: ${session.duration_minutes || 0} minutes`);
            console.log(`     Date: ${session.start_time}`);
            console.log('');
          });
        }
      }
    }
    
    // 3. Vérifier les activités Kanban
    console.log('\n📌 3. Activités Kanban:\n');
    
    const { data: kanbanCards } = await supabase
      .from('kanban_cards')
      .select(`
        *,
        kanban_columns (
          title
        )
      `)
      .limit(10)
      .order('updated_at', { ascending: false });
    
    if (kanbanCards?.length > 0) {
      console.log(`✅ ${kanbanCards.length} cartes Kanban récentes`);
      kanbanCards.forEach(card => {
        console.log(`   - "${card.title}" dans colonne "${card.kanban_columns?.title}"`);
        console.log(`     Mis à jour: ${card.updated_at}`);
      });
    }
    
    // 4. Comprendre ce qui est tracké
    console.log('\n📝 4. Types d\'activités trackées:\n');
    console.log('Le système semble tracker:');
    console.log('   1. ⏱️  Sessions de time tracking (temps passé sur projets)');
    console.log('   2. 📋 Mouvements de cartes Kanban');
    console.log('   3. 📁 Actions sur le Drive (potentiellement)');
    console.log('   4. 💬 Messages (potentiellement)');
    
    // 5. Vérifier pourquoi rien ne s\'affiche
    console.log('\n⚠️  5. Diagnostic du problème:\n');
    
    if (!timeSessions || timeSessions.length === 0) {
      console.log('❌ Aucune session de time tracking trouvée');
      console.log('   → Les activités Drive/Kanban ne créent PAS automatiquement de sessions');
      console.log('   → Il faut utiliser le Time Tracker pour enregistrer du temps');
    }
    
    console.log('\n💡 Solution:');
    console.log('   - Les activités affichées sont basées sur time_tracking_sessions');
    console.log('   - Pour voir des activités, il faut démarrer le Time Tracker');
    console.log('   - Les actions Kanban/Drive ne sont PAS automatiquement trackées comme activités');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkActivities();