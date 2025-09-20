import { supabase } from '@/integrations/supabase/client';

export interface AIConversationContext {
  memberId: string;
  promptId: string;
  projectId: string;
  conversationHistory: Message[];
}

export interface Message {
  id: string;
  content: string;
  sender_email: string;
  sender_id: string;
  created_at: string;
}

export interface AIContentDetection {
  isLongFormContent: boolean;
  contentType: 'article' | 'document' | 'rapport' | 'standard';
  shouldSaveToDrive: boolean;
  title?: string;
}

/**
 * Détecte si un message est envoyé à une IA
 */
export const isMessageToAI = (selectedConversation: any, projectMembers: any[]): boolean => {
  if (selectedConversation.type !== 'user' || !selectedConversation.id) {
    return false;
  }

  const targetMember = projectMembers.find(m => m.id === selectedConversation.id);
  return targetMember?.isAI || false;
};

/**
 * Récupère le contexte de conversation pour l'IA
 */
export const getAIConversationContext = async (
  aiMemberId: string,
  projectId: string,
  projectMembers: any[]
): Promise<AIConversationContext | null> => {
  try {
    const aiMember = projectMembers.find(m => m.id === aiMemberId && m.isAI);
    if (!aiMember || !aiMember.promptId) {
      console.error('❌ Membre IA non trouvé ou sans prompt_id:', aiMemberId);
      return null;
    }

    // Récupérer l'historique des messages pour ce thread
    const { data: threads, error: threadsError } = await supabase
      .from('message_threads')
      .select('id')
      .eq('project_id', projectId)
      .limit(1);

    if (threadsError || !threads || threads.length === 0) {
      console.error('❌ Thread de conversation non trouvé:', threadsError);
      return null;
    }

    const threadId = threads[0].id;

    // Récupérer les derniers messages de la conversation
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, content, sender_email, sender_id, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(10); // Derniers 10 messages pour le contexte

    if (messagesError) {
      console.error('❌ Erreur récupération messages:', messagesError);
      return null;
    }

    return {
      memberId: aiMemberId,
      promptId: aiMember.promptId,
      projectId: projectId,
      conversationHistory: messages || []
    };

  } catch (error) {
    console.error('❌ Erreur récupération contexte IA:', error);
    return null;
  }
};

/**
 * Génère une réponse IA via Edge Function
 */
export const generateAIResponse = async (
  context: AIConversationContext,
  userMessage: string
): Promise<string | null> => {
  try {
    console.log('🤖 Génération réponse IA pour prompt:', context.promptId);

    const { data, error } = await supabase.functions.invoke('ai-conversation-handler', {
      body: {
        promptId: context.promptId,
        projectId: context.projectId,
        userMessage: userMessage,
        conversationHistory: context.conversationHistory.slice(0, 5) // Limiter l'historique
      }
    });

    if (error) {
      console.error('❌ Erreur génération IA:', error);
      return null;
    }

    if (!data.success) {
      console.error('❌ Réponse IA échouée:', data.error);
      return null;
    }

    return data.response;

  } catch (error) {
    console.error('❌ Erreur appel IA:', error);
    return null;
  }
};

/**
 * Détecte si le contenu IA doit être sauvegardé dans le Drive
 */
export const detectAIContent = (content: string): AIContentDetection => {
  const contentLength = content.length;
  const isLongForm = contentLength > 500;

  // Mots-clés indiquant une production de contenu
  const contentKeywords = [
    'article', 'blog', 'document', 'rapport', 'guide', 'manuel',
    'tutoriel', 'présentation', 'documentation', 'analyse',
    'étude', 'synthèse', 'résumé', 'compte-rendu'
  ];

  const lowercaseContent = content.toLowerCase();
  const hasContentKeywords = contentKeywords.some(keyword =>
    lowercaseContent.includes(keyword)
  );

  // Détection du type de contenu
  let contentType: 'article' | 'document' | 'rapport' | 'standard' = 'standard';

  if (lowercaseContent.includes('article') || lowercaseContent.includes('blog')) {
    contentType = 'article';
  } else if (lowercaseContent.includes('rapport') || lowercaseContent.includes('analyse')) {
    contentType = 'rapport';
  } else if (lowercaseContent.includes('document') || lowercaseContent.includes('guide')) {
    contentType = 'document';
  }

  // Extraction du titre potentiel (première ligne ou premier paragraphe)
  const lines = content.split('\n').filter(line => line.trim());
  const title = lines.length > 0 ? lines[0].substring(0, 50).trim() : undefined;

  return {
    isLongFormContent: isLongForm,
    contentType,
    shouldSaveToDrive: isLongForm && (hasContentKeywords || contentLength > 1000),
    title
  };
};

/**
 * Sauvegarde le contenu IA dans le Drive automatiquement
 */
export const saveAIContentToDrive = async (
  content: string,
  detection: AIContentDetection,
  projectId: string,
  aiMemberName: string
): Promise<boolean> => {
  try {
    if (!detection.shouldSaveToDrive) {
      console.log('📝 Contenu IA ne nécessite pas de sauvegarde Drive');
      return false;
    }

    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const fileName = `${timestamp}_${detection.contentType}_${aiMemberName.replace(/\s+/g, '_')}.md`;

    // Préparer le contenu formaté
    const formattedContent = `# ${detection.title || 'Contenu généré par IA'}

**Généré par:** ${aiMemberName}
**Date:** ${new Date().toLocaleDateString('fr-FR')}
**Type:** ${detection.contentType}
**Projet:** ${projectId}

---

${content}

---
*Document généré automatiquement par l'IA de l'équipe*
`;

    console.log('💾 Sauvegarde contenu IA dans Drive:', fileName);

    const { data, error } = await supabase.functions.invoke('save-ai-content-to-drive', {
      body: {
        projectId: projectId,
        fileName: fileName,
        content: formattedContent,
        contentType: detection.contentType,
        aiMemberName: aiMemberName
      }
    });

    if (error) {
      console.error('❌ Erreur sauvegarde Drive:', error);
      return false;
    }

    if (!data.success) {
      console.error('❌ Sauvegarde Drive échouée:', data.error);
      return false;
    }

    console.log('✅ Contenu IA sauvegardé:', data.filePath);
    return true;

  } catch (error) {
    console.error('❌ Erreur sauvegarde IA:', error);
    return false;
  }
};

/**
 * Gestionnaire principal pour les messages IA
 */
export const handleAIConversation = async (
  selectedConversation: any,
  userMessage: string,
  projectId: string,
  projectMembers: any[],
  threadId: string
): Promise<{ success: boolean; aiResponse?: string; saved?: boolean }> => {
  try {
    if (!isMessageToAI(selectedConversation, projectMembers)) {
      return { success: false };
    }

    console.log('🤖 Traitement conversation IA pour:', selectedConversation.name);

    // 1. Récupérer le contexte IA
    const context = await getAIConversationContext(
      selectedConversation.id,
      projectId,
      projectMembers
    );

    if (!context) {
      console.error('❌ Impossible de récupérer le contexte IA');
      return { success: false };
    }

    // 2. Générer la réponse IA
    const aiResponse = await generateAIResponse(context, userMessage);

    if (!aiResponse) {
      console.error('❌ Aucune réponse IA générée');
      return { success: false };
    }

    // 3. Détecter si le contenu doit être sauvegardé
    const detection = detectAIContent(aiResponse);
    let saved = false;

    if (detection.shouldSaveToDrive) {
      saved = await saveAIContentToDrive(
        aiResponse,
        detection,
        projectId,
        selectedConversation.name
      );
    }

    // 4. Envoyer la réponse IA dans le thread
    const aiMember = projectMembers.find(m => m.id === selectedConversation.id);
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content: aiResponse,
        sender_id: aiMember.id,
        sender_email: aiMember.email,
        sender_name: aiMember.name,
        message_attachments: saved ? [{
          file_name: `contenu_${detection.contentType}_sauvegarde.md`,
          file_path: `projects/${projectId}/IA/`,
          file_size: aiResponse.length,
          file_type: 'text/markdown'
        }] : undefined
      });

    if (messageError) {
      console.error('❌ Erreur envoi message IA:', messageError);
      return { success: false };
    }

    console.log('✅ Conversation IA traitée avec succès');
    return { success: true, aiResponse, saved };

  } catch (error) {
    console.error('❌ Erreur traitement conversation IA:', error);
    return { success: false };
  }
};