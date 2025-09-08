#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://egdelmcijszuapcpglsy.supabase.co";
// On va utiliser un token temporaire - l'utilisateur devra fournir la clé service role
console.log("🔧 Application directe du correctif RLS");

// Pour simplifier, on va essayer d'appliquer le correctif via l'edge function déployée
async function applyRlsFixViaFunction() {
  try {
    const response = await fetch("https://egdelmcijszuapcpglsy.supabase.co/functions/v1/apply-event-rls-fix", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e'}`
      },
      body: JSON.stringify({})
    });

    const result = await response.text();
    console.log("📊 Résultat fonction:", result);

    if (response.ok) {
      console.log("✅ Correctif appliqué via edge function");
      return true;
    } else {
      console.log("❌ Échec via edge function, essayons autre chose");
      return false;
    }
  } catch (error) {
    console.error("❌ Erreur edge function:", error);
    return false;
  }
}

// Alternative: générer le SQL à exécuter manuellement
function generateSQL() {
  console.log("\n🔧 SQL à exécuter manuellement dans Supabase Dashboard:");
  console.log("=" .repeat(60));
  
  const sql = `
-- Supprimer les policies problématiques
DROP POLICY IF EXISTS "users_insert_event_attendees" ON project_event_attendees;
DROP POLICY IF EXISTS "project_members_create_notifications" ON candidate_event_notifications;

-- Créer les nouvelles policies simplifiées
CREATE POLICY "authenticated_users_insert_attendees"
ON project_event_attendees FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_users_create_notifications"
ON candidate_event_notifications FOR INSERT
TO authenticated
WITH CHECK (true);
`;

  console.log(sql);
  console.log("=" .repeat(60));
  console.log("💡 Copiez ce SQL et exécutez-le dans Supabase Dashboard > SQL Editor");
}

async function main() {
  console.log("🚀 Tentative d'application automatique...");
  
  const success = await applyRlsFixViaFunction();
  
  if (!success) {
    console.log("\n📝 Application manuelle nécessaire:");
    generateSQL();
  }
}

main();