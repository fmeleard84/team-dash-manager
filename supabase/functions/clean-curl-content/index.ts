import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('🔍 Recherche de contenu suspect...');

    // Patterns suspects à rechercher
    const suspiciousPatterns = [
      'curl -L',
      'Last login',
      'ttys000',
      'francis@MBP',
      'talent-soft',
      'ASP.NET_SessionId'
    ];

    // Vérifier les cartes Kanban
    const { data: cards } = await supabaseClient
      .from('kanban_cards')
      .select('*');

    let cleanedCount = 0;

    if (cards) {
      for (const card of cards) {
        let needsUpdate = false;
        let newTitle = card.title;
        let newDescription = card.description;

        // Vérifier si le contenu contient des patterns suspects
        for (const pattern of suspiciousPatterns) {
          if (card.title?.includes(pattern)) {
            newTitle = 'Carte à renommer';
            needsUpdate = true;
          }
          if (card.description?.includes(pattern)) {
            newDescription = '';
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          console.log(`Nettoyage de la carte ${card.id}`);
          await supabaseClient
            .from('kanban_cards')
            .update({
              title: newTitle,
              description: newDescription
            })
            .eq('id', card.id);
          cleanedCount++;
        }
      }
    }

    // Vérifier les messages
    const { data: messages } = await supabaseClient
      .from('project_messages')
      .select('*');

    if (messages) {
      for (const msg of messages) {
        let needsUpdate = false;
        let newContent = msg.content;

        for (const pattern of suspiciousPatterns) {
          if (msg.content?.includes(pattern)) {
            newContent = '[Contenu nettoyé - contenait des données inappropriées]';
            needsUpdate = true;
            break;
          }
        }

        if (needsUpdate) {
          console.log(`Nettoyage du message ${msg.id}`);
          await supabaseClient
            .from('project_messages')
            .update({ content: newContent })
            .eq('id', msg.id);
          cleanedCount++;
        }
      }
    }

    // Vérifier les événements du planning
    const { data: events } = await supabaseClient
      .from('project_events')
      .select('*');

    if (events) {
      for (const event of events) {
        let needsUpdate = false;
        let newTitle = event.title;
        let newDescription = event.description;

        for (const pattern of suspiciousPatterns) {
          if (event.title?.includes(pattern)) {
            newTitle = 'Événement à renommer';
            needsUpdate = true;
          }
          if (event.description?.includes(pattern)) {
            newDescription = '';
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          console.log(`Nettoyage de l'événement ${event.id}`);
          await supabaseClient
            .from('project_events')
            .update({
              title: newTitle,
              description: newDescription
            })
            .eq('id', event.id);
          cleanedCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Nettoyage terminé. ${cleanedCount} éléments nettoyés.`,
        cleanedCount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});