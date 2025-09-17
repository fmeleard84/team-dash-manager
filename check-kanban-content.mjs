import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Recherche de contenu suspect dans les cartes Kanban...\n');

// Rechercher les cartes avec du contenu curl
const { data: cards, error } = await supabase
  .from('kanban_cards')
  .select('*')
  .or('title.ilike.%curl%,description.ilike.%curl%,title.ilike.%Last login%,description.ilike.%Last login%,title.ilike.%francis@MBP%,description.ilike.%francis@MBP%');

if (error) {
  console.error('Erreur:', error);
  process.exit(1);
}

if (cards && cards.length > 0) {
  console.log(`❗ Trouvé ${cards.length} carte(s) avec du contenu suspect:\n`);

  for (const card of cards) {
    console.log(`📝 Carte: ${card.id}`);
    console.log(`   Titre: ${card.title}`);
    console.log(`   Description: ${card.description?.substring(0, 100)}...`);
    console.log(`   Créée le: ${card.created_at}`);
    console.log('---');

    // Nettoyer automatiquement si c'est vraiment du contenu curl
    if (card.title?.includes('curl') || card.title?.includes('Last login') ||
        card.description?.includes('curl') || card.description?.includes('Last login')) {

      console.log(`🧹 Nettoyage de la carte ${card.id}...`);

      // Mettre à jour avec un contenu par défaut
      const { error: updateError } = await supabase
        .from('kanban_cards')
        .update({
          title: card.title?.includes('curl') || card.title?.includes('Last login') ? 'Carte à renommer' : card.title,
          description: card.description?.includes('curl') || card.description?.includes('Last login') ? '' : card.description
        })
        .eq('id', card.id);

      if (updateError) {
        console.error(`   ❌ Erreur lors du nettoyage:`, updateError);
      } else {
        console.log(`   ✅ Carte nettoyée`);
      }
    }
  }
} else {
  console.log('✅ Aucune carte avec du contenu suspect trouvée');
}

// Vérifier aussi les colonnes
const { data: columns, error: colError } = await supabase
  .from('kanban_columns')
  .select('*')
  .or('title.ilike.%curl%,title.ilike.%Last login%,title.ilike.%francis@MBP%');

if (columns && columns.length > 0) {
  console.log(`\n❗ Trouvé ${columns.length} colonne(s) avec du contenu suspect:\n`);
  for (const col of columns) {
    console.log(`📊 Colonne: ${col.id}`);
    console.log(`   Titre: ${col.title}`);
    console.log('---');
  }
}

console.log('\n✨ Vérification terminée');