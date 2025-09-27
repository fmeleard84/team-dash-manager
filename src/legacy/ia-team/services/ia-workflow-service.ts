import { supabase } from '@/integrations/supabase/client';
import { IAResource, IAWorkflowContext, IAWorkflowResult, IADeliverable } from '../types/ia-team.types';

export class IAWorkflowService {
  /**
   * Traite une demande complète de workflow IA
   */
  async processWorkflow(context: IAWorkflowContext): Promise<IAWorkflowResult> {
    try {
      // 1. Valider le contexte
      if (!this.validateContext(context)) {
        return {
          success: false,
          error: 'Contexte invalide pour le workflow IA'
        };
      }

      // 2. Récupérer le prompt de l'IA
      const prompt = await this.getIAPrompt(context.ia_resource);
      if (!prompt) {
        return {
          success: false,
          error: 'Prompt IA non configuré'
        };
      }

      // 3. Analyser la demande
      const analysis = this.analyzeRequest(context.request);

      // 4. Générer la réponse IA
      const iaResponse = await this.generateIAResponse(prompt, context, analysis);

      // 5. Créer le livrable selon le type
      let deliverable: IADeliverable | undefined;
      if (analysis.requiresDeliverable) {
        deliverable = await this.createDeliverable(
          context,
          analysis.deliverableType,
          iaResponse
        );
      }

      // 6. Créer le message de réponse
      await this.createResponseMessage(context, iaResponse, deliverable);

      return {
        success: true,
        deliverable,
        message: iaResponse.content
      };
    } catch (error: any) {
      console.error('Erreur workflow IA:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors du traitement du workflow IA'
      };
    }
  }

  /**
   * Valide le contexte du workflow
   */
  private validateContext(context: IAWorkflowContext): boolean {
    return !!(
      context.project_id &&
      context.ia_resource &&
      context.request &&
      context.requester_id
    );
  }

  /**
   * Récupère le prompt configuré pour l'IA
   */
  private async getIAPrompt(iaResource: IAResource): Promise<string | null> {
    if (iaResource.prompt) {
      return iaResource.prompt.prompt;
    }

    if (iaResource.prompt_id) {
      const { data, error } = await supabase
        .from('prompts_ia')
        .select('prompt')
        .eq('id', iaResource.prompt_id)
        .single();

      if (!error && data) {
        return data.prompt;
      }
    }

    return null;
  }

  /**
   * Analyse la demande pour déterminer le type de livrable
   */
  private analyzeRequest(request: string): {
    requiresDeliverable: boolean;
    deliverableType: 'document' | 'kanban_card' | 'file' | 'analysis' | 'none';
    keywords: string[];
  } {
    const lowerRequest = request.toLowerCase();
    const keywords: string[] = [];

    // Détection de mots-clés
    const documentKeywords = ['document', 'rédige', 'écris', 'rapport', 'compte-rendu'];
    const kanbanKeywords = ['tâche', 'kanban', 'carte', 'todo', 'action'];
    const fileKeywords = ['fichier', 'export', 'télécharge'];
    const analysisKeywords = ['analyse', 'étude', 'synthèse', 'résumé'];

    let deliverableType: 'document' | 'kanban_card' | 'file' | 'analysis' | 'none' = 'none';
    let requiresDeliverable = false;

    if (documentKeywords.some(kw => lowerRequest.includes(kw))) {
      deliverableType = 'document';
      requiresDeliverable = true;
      keywords.push(...documentKeywords.filter(kw => lowerRequest.includes(kw)));
    } else if (kanbanKeywords.some(kw => lowerRequest.includes(kw))) {
      deliverableType = 'kanban_card';
      requiresDeliverable = true;
      keywords.push(...kanbanKeywords.filter(kw => lowerRequest.includes(kw)));
    } else if (fileKeywords.some(kw => lowerRequest.includes(kw))) {
      deliverableType = 'file';
      requiresDeliverable = true;
      keywords.push(...fileKeywords.filter(kw => lowerRequest.includes(kw)));
    } else if (analysisKeywords.some(kw => lowerRequest.includes(kw))) {
      deliverableType = 'analysis';
      requiresDeliverable = true;
      keywords.push(...analysisKeywords.filter(kw => lowerRequest.includes(kw)));
    }

    return {
      requiresDeliverable,
      deliverableType,
      keywords
    };
  }

  /**
   * Génère la réponse de l'IA via l'Edge Function
   */
  private async generateIAResponse(
    systemPrompt: string,
    context: IAWorkflowContext,
    analysis: any
  ): Promise<{ content: string; title?: string }> {
    // Construire le contexte enrichi
    const enrichedPrompt = `
${systemPrompt}

Contexte du projet:
- Projet ID: ${context.project_id}
- Tu es: ${context.ia_resource.name}
- Demandeur: ${context.team_members.find(m => m.id === context.requester_id)?.name || 'Membre de l'équipe'}
- Type de livrable attendu: ${analysis.deliverableType === 'none' ? 'Réponse simple' : analysis.deliverableType}

Membres de l'équipe:
${context.team_members.map(m => `- ${m.name} (${m.role})`).join('\n')}
`;

    // Appel à l'Edge Function
    const { data, error } = await supabase.functions.invoke('chat-completion', {
      body: {
        messages: [
          { role: 'system', content: enrichedPrompt },
          { role: 'user', content: context.request }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }
    });

    if (error) throw error;

    const content = data.choices[0]?.message?.content || '';

    // Extraire le titre si présent (première ligne commençant par #)
    const lines = content.split('\n');
    let title = undefined;
    if (lines[0].startsWith('#')) {
      title = lines[0].replace(/^#\s*/, '');
    }

    return { content, title };
  }

  /**
   * Crée le livrable dans le système approprié
   */
  private async createDeliverable(
    context: IAWorkflowContext,
    type: string,
    iaResponse: { content: string; title?: string }
  ): Promise<IADeliverable> {
    const deliverable: IADeliverable = {
      id: crypto.randomUUID(),
      project_id: context.project_id,
      ia_resource_id: context.ia_resource.id,
      type: type as any,
      title: iaResponse.title || `Livrable ${type}`,
      content: iaResponse.content,
      created_at: new Date().toISOString()
    };

    switch (type) {
      case 'document':
        // Créer un document dans le Drive
        const fileName = `${deliverable.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.md`;
        const filePath = `projects/${context.project_id}/ia_deliverables/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, new Blob([iaResponse.content], { type: 'text/markdown' }), {
            contentType: 'text/markdown',
            upsert: true
          });

        if (!uploadError) {
          deliverable.file_path = filePath;
        }
        break;

      case 'kanban_card':
        // Créer une carte Kanban
        const { data: columns } = await supabase
          .from('kanban_columns')
          .select('id')
          .eq('project_id', context.project_id)
          .order('position')
          .limit(1);

        if (columns && columns[0]) {
          const { data: card } = await supabase
            .from('kanban_cards')
            .insert({
              column_id: columns[0].id,
              title: deliverable.title,
              description: iaResponse.content,
              position: 0,
              created_by: `ia_${context.ia_resource.id}`
            })
            .select()
            .single();

          if (card) {
            deliverable.kanban_column_id = columns[0].id;
            deliverable.metadata = { card_id: card.id };
          }
        }
        break;

      case 'analysis':
      case 'file':
        // Pour l'instant, stocker comme contenu simple
        // À étendre selon les besoins
        break;
    }

    return deliverable;
  }

  /**
   * Crée le message de réponse dans la conversation
   */
  private async createResponseMessage(
    context: IAWorkflowContext,
    iaResponse: { content: string; title?: string },
    deliverable?: IADeliverable
  ): Promise<void> {
    let messageContent = iaResponse.content;

    if (deliverable) {
      const deliverableLink = this.getDeliverableLink(deliverable);
      messageContent = `✅ J'ai créé ${this.getDeliverableDescription(deliverable.type)} "${deliverable.title}"\n\n${deliverableLink}\n\n${iaResponse.content}`;
    }

    // Créer le message dans la table messages
    await supabase
      .from('messages')
      .insert({
        project_id: context.project_id,
        sender_id: `ia_${context.ia_resource.id}`,
        content: messageContent,
        metadata: {
          type: deliverable ? 'deliverable' : 'text',
          deliverable_id: deliverable?.id,
          deliverable_type: deliverable?.type
        }
      });
  }

  /**
   * Génère un lien vers le livrable
   */
  private getDeliverableLink(deliverable: IADeliverable): string {
    switch (deliverable.type) {
      case 'document':
        return deliverable.file_path ? `📄 [Voir le document](${deliverable.file_path})` : '';
      case 'kanban_card':
        return `📋 Carte ajoutée au Kanban`;
      case 'analysis':
        return `📊 Analyse disponible ci-dessous`;
      default:
        return '';
    }
  }

  /**
   * Retourne une description du type de livrable
   */
  private getDeliverableDescription(type: string): string {
    switch (type) {
      case 'document': return 'un document';
      case 'kanban_card': return 'une carte Kanban';
      case 'file': return 'un fichier';
      case 'analysis': return 'une analyse';
      default: return 'un livrable';
    }
  }
}

// Export d'une instance unique
export const iaWorkflowService = new IAWorkflowService();