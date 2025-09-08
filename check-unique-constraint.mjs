import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.oYNLLJEW8Qv4zcEPUb-wuQR3SZ2pTKDR0M3pchP3fII';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndFix() {
  console.log('=== VÉRIFICATION ET RÉPARATION CONTRAINTE UNIQUE ===\n');
  
  // 1. Vérifier les contraintes existantes
  const { data: constraints, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT conname, contype 
      FROM pg_constraint 
      WHERE conrelid = 'project_event_attendees'::regclass
      AND contype = 'u';
    `
  });

  console.log('Contraintes UNIQUE existantes:', constraints);

  // 2. Supprimer toutes les anciennes contraintes UNIQUE
  console.log('\nSuppression des anciennes contraintes...');
  await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE project_event_attendees 
      DROP CONSTRAINT IF EXISTS project_event_attendees_unique;
      
      ALTER TABLE project_event_attendees 
      DROP CONSTRAINT IF EXISTS project_event_attendees_event_user_unique;
    `
  });

  // 3. Créer la nouvelle contrainte UNIQUE
  console.log('Création de la nouvelle contrainte UNIQUE...');
  const { error: createError } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE project_event_attendees 
      ADD CONSTRAINT project_event_attendees_unique 
      UNIQUE (event_id, user_id);
    `
  });

  if (createError) {
    console.error('Erreur création:', createError);
  } else {
    console.log('✅ Contrainte UNIQUE créée avec succès!');
  }

  // 4. Vérifier le résultat
  const { data: newConstraints } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'project_event_attendees'::regclass
      AND contype = 'u';
    `
  });

  console.log('\nNouvelles contraintes UNIQUE:', newConstraints);
}

checkAndFix();
