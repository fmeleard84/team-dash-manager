import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer toutes les FAQs actives depuis faq_items
    const { data: faqs, error: faqError } = await supabase
      .from('faq_items')
      .select('*')
      .eq('is_published', true);

    if (faqError) throw faqError;

    console.log(`Processing ${faqs?.length || 0} FAQs for vectorization`);

    const results = [];
    
    for (const faq of faqs || []) {
      try {
        // Préparer le texte à vectoriser (question + réponse + tags)
        const textToEmbed = [
          `Question: ${faq.question}`,
          `Réponse: ${faq.answer}`,
          faq.category ? `Catégorie: ${faq.category}` : '',
          faq.tags && faq.tags.length > 0 ? `Tags: ${faq.tags.join(', ')}` : ''
        ].filter(Boolean).join('\n');

        // Appeler l'API OpenAI pour créer l'embedding
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: textToEmbed,
          }),
        });

        if (!embeddingResponse.ok) {
          const error = await embeddingResponse.text();
          console.error('OpenAI API error:', error);
          continue;
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;

        // Vérifier si un embedding existe déjà pour cette FAQ
        const { data: existing } = await supabase
          .from('documentation_embeddings')
          .select('id')
          .eq('source_table', 'faq_items')
          .eq('source_id', faq.id)
          .single();

        const embeddingRecord = {
          content: textToEmbed,
          content_type: 'faq',
          metadata: {
            question: faq.question,
            answer: faq.answer,
            category: faq.category,
            tags: faq.tags,
            order_index: faq.order_index
          },
          embedding: `[${embedding.join(',')}]`,
          source_id: faq.id,
          source_table: 'faq_items',
          updated_at: new Date().toISOString()
        };

        if (existing) {
          // Mettre à jour l'embedding existant
          const { error: updateError } = await supabase
            .from('documentation_embeddings')
            .update(embeddingRecord)
            .eq('id', existing.id);

          if (updateError) throw updateError;
          
          // Marquer la FAQ comme synchronisée
          await supabase
            .from('faq_items')
            .update({ embedding_synced_at: new Date().toISOString() })
            .eq('id', faq.id);
          
          results.push({ faq_id: faq.id, action: 'updated' });
        } else {
          // Créer un nouvel embedding
          const { error: insertError } = await supabase
            .from('documentation_embeddings')
            .insert(embeddingRecord);

          if (insertError) throw insertError;
          
          // Marquer la FAQ comme synchronisée
          await supabase
            .from('faq_items')
            .update({ embedding_synced_at: new Date().toISOString() })
            .eq('id', faq.id);
          
          results.push({ faq_id: faq.id, action: 'created' });
        }

      } catch (error) {
        console.error(`Error processing FAQ ${faq.id}:`, error);
        results.push({ faq_id: faq.id, action: 'error', error: error.message });
      }
    }

    // Supprimer les embeddings des FAQs inactives ou supprimées
    const { data: activeIds } = await supabase
      .from('faq_items')
      .select('id')
      .eq('is_published', true);

    const activeIdList = activeIds?.map(item => item.id) || [];

    if (activeIdList.length > 0) {
      const { error: deleteError } = await supabase
        .from('documentation_embeddings')
        .delete()
        .eq('source_table', 'faq_items')
        .not('source_id', 'in', `(${activeIdList.join(',')})`);

      if (deleteError) {
        console.error('Error deleting inactive FAQ embeddings:', deleteError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'FAQ embeddings synchronized successfully',
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});