import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRealtimeTables() {
  console.log('Vérification des tables avec realtime activé...\n');

  const tablesToTest = [
    'projects',
    'hr_resource_assignments',
    'candidate_notifications',
    'messages',
    'kanban_cards'
  ];

  for (const table of tablesToTest) {
    console.log(`Testing ${table}...`);
    
    let subscribed = false;
    
    await new Promise((resolve) => {
      const channel = supabase
        .channel(`test-${table}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table
          },
          () => {}
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✅ ${table}: Realtime ACTIF`);
            subscribed = true;
            supabase.removeChannel(channel);
            resolve(true);
          } else if (status === 'TIMED_OUT') {
            console.log(`❌ ${table}: Realtime INACTIF (timeout)`);
            supabase.removeChannel(channel);
            resolve(false);
          } else if (status === 'CHANNEL_ERROR') {
            console.log(`❌ ${table}: Erreur channel`);
            supabase.removeChannel(channel);
            resolve(false);
          }
        });
      
      // Timeout après 3 secondes
      setTimeout(() => {
        if (!subscribed) {
          console.log(`❌ ${table}: Realtime INACTIF (timeout)`);
          supabase.removeChannel(channel);
          resolve(false);
        }
      }, 3000);
    });
    
    console.log('');
  }
}

checkRealtimeTables();