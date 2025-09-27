import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { IAResource, IAWorkflowContext, IADeliverable } from '../types/ia-team.types';

interface UseIAMessagingOptions {
  projectId: string;
  iaResource: IAResource;
  onDeliverableCreated?: (deliverable: IADeliverable) => void;
}

export function useIAMessaging({ projectId, iaResource, onDeliverableCreated }: UseIAMessagingOptions) {
  const [processing, setProcessing] = useState(false);
  const [response, setResponse] = useState<string>('');
  const { toast } = useToast();

  const processIARequest = async (message: string, requesterId: string) => {
    setProcessing(true);
    setResponse('');

    try {
      // 1. Analyser la demande pour déterminer le type de livrable
      const deliverableType = detectDeliverableType(message);

      // 2. Créer le contexte pour l'IA
      const context: IAWorkflowContext = {
        project_id: projectId,
        ia_resource: iaResource,
        team_members: [], // À remplir avec les membres réels
        request: message,
        requester_id: requesterId
      };

      // 3. Appeler l'IA avec le prompt approprié
      const iaResponse = await callOpenAI(context);

      // 4. Créer le livrable si nécessaire
      if (deliverableType !== 'none') {
        const deliverable = await createDeliverable(
          projectId,
          iaResource.id,
          deliverableType,
          iaResponse.title || 'Livrable IA',
          iaResponse.content
        );

        if (onDeliverableCreated && deliverable) {
          onDeliverableCreated(deliverable);
        }

        // 5. Créer un message dans la conversation
        await createIAMessage(
          projectId,
          iaResource.id,
          `J'ai créé ${getDeliverableDescription(deliverableType)} "${iaResponse.title || 'Livrable'}" comme demandé.`,
          {
            type: 'deliverable',
            deliverable_type: deliverableType,
            deliverable_id: deliverable.id
          }
        );

        setResponse(iaResponse.content);
      } else {
        // Simple réponse sans livrable
        await createIAMessage(
          projectId,
          iaResource.id,
          iaResponse.content,
          { type: 'text' }
        );
        setResponse(iaResponse.content);
      }

      return iaResponse;
    } catch (error: any) {
      console.error('Erreur traitement IA:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de traiter la demande IA',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const detectDeliverableType = (message: string): 'document' | 'kanban_card' | 'file' | 'analysis' | 'none' => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('document') || lowerMessage.includes('rédige') || lowerMessage.includes('écris')) {
      return 'document';
    }
    if (lowerMessage.includes('tâche') || lowerMessage.includes('kanban') || lowerMessage.includes('carte')) {
      return 'kanban_card';
    }
    if (lowerMessage.includes('fichier') || lowerMessage.includes('export')) {
      return 'file';
    }
    if (lowerMessage.includes('analyse') || lowerMessage.includes('rapport')) {
      return 'analysis';
    }

    return 'none';
  };

  const callOpenAI = async (context: IAWorkflowContext) => {
    // Appel à l'Edge Function chat-completion avec le contexte
    const { data, error } = await supabase.functions.invoke('chat-completion', {
      body: {
        messages: [
          {
            role: 'system',
            content: context.ia_resource.prompt?.prompt || 'Tu es un assistant IA professionnel.'
          },
          {
            role: 'user',
            content: context.request
          }
        ],
        context: 'ia_team_workflow',
        project_id: context.project_id
      }
    });

    if (error) throw error;

    // Parser la réponse pour extraire titre et contenu
    const content = data.choices[0]?.message?.content || '';
    const lines = content.split('\n');
    const title = lines[0]?.replace(/^#\s*/, '') || 'Livrable IA';

    return {
      title,
      content,
      raw: data
    };
  };

  const createDeliverable = async (
    projectId: string,
    iaResourceId: string,
    type: string,
    title: string,
    content: string
  ): Promise<IADeliverable> => {
    let deliverable: any = {
      project_id: projectId,
      ia_resource_id: iaResourceId,
      type,
      title,
      created_at: new Date().toISOString()
    };

    switch (type) {
      case 'document':
        // Créer un fichier markdown dans le drive
        const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}.md`;
        const filePath = `projects/${projectId}/ia_deliverables/${fileName}`;

        // Upload du contenu comme fichier
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, new Blob([content], { type: 'text/markdown' }), {
            contentType: 'text/markdown',
            upsert: true
          });

        if (!uploadError) {
          deliverable.file_path = filePath;
          deliverable.content = content;
        }
        break;

      case 'kanban_card':
        // Créer une carte Kanban
        const { data: columns } = await supabase
          .from('kanban_columns')
          .select('id')
          .eq('project_id', projectId)
          .order('position')
          .limit(1);

        if (columns && columns[0]) {
          const { data: card, error: cardError } = await supabase
            .from('kanban_cards')
            .insert({
              column_id: columns[0].id,
              title,
              description: content,
              position: 0,
              created_by: iaResourceId
            })
            .select()
            .single();

          if (!cardError && card) {
            deliverable.kanban_column_id = columns[0].id;
            deliverable.metadata = { card_id: card.id };
          }
        }
        break;

      case 'analysis':
      case 'file':
        deliverable.content = content;
        break;
    }

    return deliverable as IADeliverable;
  };

  const createIAMessage = async (
    projectId: string,
    senderId: string,
    content: string,
    metadata: any
  ) => {
    // Créer un message dans la table messages du projet
    const { error } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        sender_id: senderId,
        content,
        metadata,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Erreur création message IA:', error);
    }
  };

  const getDeliverableDescription = (type: string): string => {
    switch (type) {
      case 'document': return 'un document';
      case 'kanban_card': return 'une carte Kanban';
      case 'file': return 'un fichier';
      case 'analysis': return 'une analyse';
      default: return 'un livrable';
    }
  };

  return {
    processing,
    response,
    processIARequest
  };
}