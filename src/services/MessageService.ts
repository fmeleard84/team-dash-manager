import { supabase } from '@/integrations/supabase/client';
// La génération DOCX se fait maintenant côté serveur dans l'Edge Function

export type ThreadType = 'public' | 'private';

export interface Thread {
  id: string;
  project_id: string;
  type: ThreadType;
  participants: string[] | null; // null = tous les membres du projet
  title: string;
  metadata?: any;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_name: string;
  sender_email: string;
  content: string;
  is_private: boolean;
  participants: string[] | null;
  created_at: string;
  metadata?: any;
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  isAI?: boolean;
  promptId?: string;
}

/**
 * Service unifié pour la gestion complète de la messagerie
 * PRINCIPE : Simple, Direct, RLS-based
 */
export class MessageService {

  /**
   * Récupère ou crée un thread selon les participants
   * @param projectId - L'ID du projet
   * @param participants - Les participants (null = thread public équipe)
   * @param currentUserId - L'ID de l'utilisateur actuel (pour created_by)
   * @returns Le thread ID
   */
  static async getOrCreateThread(
    projectId: string,
    participants: Participant[] | null = null,
    currentUserId?: string
  ): Promise<string> {
    try {
      // Si pas de participants spécifiques = thread public de l'équipe
      if (!participants || participants.length === 0) {
        return this.getOrCreatePublicThread(projectId, currentUserId);
      }

      // Si participants = thread privé
      return this.getOrCreatePrivateThread(projectId, participants, currentUserId);
    } catch (error) {
      console.error('❌ Erreur getOrCreateThread:', error);
      throw error;
    }
  }

  /**
   * Thread public de l'équipe (visible par tous)
   */
  private static async getOrCreatePublicThread(projectId: string, currentUserId?: string): Promise<string> {
    // Chercher le thread public existant
    const { data: existingThread } = await supabase
      .from('message_threads')
      .select('id')
      .eq('project_id', projectId)
      .or('metadata->>type.eq.team,metadata.is.null')
      .single();

    if (existingThread) {
      return existingThread.id;
    }

    // Si pas d'utilisateur courant, récupérer le owner du projet
    let createdBy = currentUserId;
    if (!createdBy) {
      const { data: project } = await supabase
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
        .single();
      createdBy = project?.owner_id;
    }

    // Créer un nouveau thread public
    const { data: project } = await supabase
      .from('projects')
      .select('title')
      .eq('id', projectId)
      .single();

    const { data: newThread, error } = await supabase
      .from('message_threads')
      .insert({
        project_id: projectId,
        title: `Équipe ${project?.title || 'Projet'}`,
        created_by: createdBy || projectId, // Fallback sur projectId si vraiment pas d'user
        metadata: {
          type: 'team',
          is_private: false
        }
      })
      .select()
      .single();

    if (error) throw error;
    return newThread.id;
  }

  /**
   * Thread privé entre participants spécifiques
   */
  private static async getOrCreatePrivateThread(
    projectId: string,
    participants: Participant[],
    currentUserId?: string
  ): Promise<string> {
    // Générer une clé unique basée sur les IDs triés
    const participantIds = participants.map(p => p.id).sort();
    const threadKey = `${projectId}_private_${participantIds.join('_')}`;

    // Chercher un thread existant avec ces participants
    const { data: existingThreads } = await supabase
      .from('message_threads')
      .select('*')
      .eq('project_id', projectId)
      .eq('metadata->>type', 'private');

    // Vérifier si un thread existe avec exactement ces participants
    const existingThread = existingThreads?.find(thread => {
      const threadParticipants = thread.metadata?.participants || [];
      const threadParticipantIds = threadParticipants.map((p: any) => p.id).sort();
      return JSON.stringify(threadParticipantIds) === JSON.stringify(participantIds);
    });

    if (existingThread) {
      return existingThread.id;
    }

    // Déterminer le créateur (utiliser le premier participant humain ou currentUserId)
    const createdBy = currentUserId || participants.find(p => !p.isAI)?.id || participants[0]?.id;

    if (!createdBy) {
      throw new Error('Impossible de déterminer le créateur du thread');
    }

    // Créer un nouveau thread privé
    const participantNames = participants.map(p => p.name.split(' ')[0]).join(', ');

    // S'assurer que les participants conservent toutes leurs propriétés
    const participantsWithFullData = participants.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      isAI: p.isAI === true, // Forcer en booléen
      role: p.role,
      promptId: p.promptId
    }));

    console.log('💾 Sauvegarde thread privé avec participants:', participantsWithFullData);

    const { data: newThread, error } = await supabase
      .from('message_threads')
      .insert({
        project_id: projectId,
        title: `Conversation privée: ${participantNames}`,
        created_by: createdBy, // Ajout du created_by requis
        metadata: {
          type: 'private',
          is_private: true,
          participants: participantsWithFullData,
          thread_key: threadKey
        }
      })
      .select()
      .single();

    if (error) throw error;
    return newThread.id;
  }

  /**
   * Envoie un message dans un thread
   * IMPORTANT: Cette méthode gère TOUT, y compris les réponses IA
   */
  static async sendMessage(
    threadId: string,
    content: string,
    senderId: string,
    senderName: string,
    senderEmail: string,
    attachments?: any[]
  ): Promise<Message> {
    try {
      // 1. Récupérer le thread pour connaître son type et ses participants
      const { data: thread, error: threadError } = await supabase
        .from('message_threads')
        .select('*')
        .eq('id', threadId)
        .single();

      if (threadError) throw threadError;

      // 2. Déterminer si le message est privé
      const isPrivate = thread.metadata?.type === 'private' || false;
      const participants = thread.metadata?.participants?.map((p: any) => p.id) || null;

      // 3. Créer le message avec les bonnes métadonnées
      const messageData = {
        thread_id: threadId,
        sender_id: senderId,
        sender_name: senderName,
        sender_email: senderEmail,
        content: content,
        metadata: {
          is_private: isPrivate,
          participants: participants,
          thread_type: thread.metadata?.type || 'team'
        }
      };

      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (messageError) throw messageError;

      // 4. Gérer les pièces jointes si nécessaire
      if (attachments && attachments.length > 0) {
        await this.attachFiles(message.id, attachments, senderId);
      }

      // 5. Mettre à jour le timestamp du thread
      await supabase
        .from('message_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', threadId);

      // 6. Vérifier si une IA doit répondre
      await this.checkAndTriggerAIResponse(thread, message, content);

      return message;
    } catch (error) {
      console.error('❌ Erreur sendMessage:', error);
      throw error;
    }
  }

  /**
   * Vérifie si une IA doit répondre et déclenche la réponse
   */
  private static async checkAndTriggerAIResponse(
    thread: any,
    userMessage: Message,
    content: string
  ): Promise<void> {
    try {
      console.log('🔍 Vérification IA pour thread:', {
        threadId: thread.id,
        threadType: thread.metadata?.type,
        participants: thread.metadata?.participants
      });

      // Vérifier si des participants IA sont dans le thread
      const participants = thread.metadata?.participants || [];

      // Log détaillé des participants
      console.log('👥 Participants détaillés:', participants.map(p => ({
        id: p.id,
        name: p.name,
        isAI: p.isAI,
        role: p.role
      })));

      const aiParticipant = participants.find((p: any) => p.isAI === true);

      if (!aiParticipant) {
        console.log('❌ Pas d\'IA dans cette conversation');
        return;
      }

      console.log('✅ IA trouvée:', aiParticipant);

      // Pour les threads privés, l'IA répond toujours
      // Pour les threads publics, l'IA répond seulement si mentionnée
      const shouldRespond = thread.metadata?.type === 'private' ||
                          content.toLowerCase().includes('@ia') ||
                          content.toLowerCase().includes(aiParticipant.name.toLowerCase());

      if (!shouldRespond) {
        console.log('⏭️ IA ne doit pas répondre (pas de mention)');
        return;
      }

      console.log('🎯 IA doit répondre!');

      // Récupérer le profil complet de l'IA
      const { data: iaProfile, error: profileError } = await supabase
        .from('hr_profiles')
        .select('id, name, prompt_id')
        .eq('id', aiParticipant.id)
        .eq('is_ai', true)
        .single();

      console.log('🔍 Recherche profil IA:', {
        aiParticipantId: aiParticipant.id,
        profileFound: !!iaProfile,
        error: profileError
      });

      if (profileError || !iaProfile) {
        console.error('❌ Erreur récupération profil IA:', profileError);
        return;
      }

      if (!iaProfile.prompt_id) {
        console.warn('⚠️ IA sans prompt configuré:', iaProfile);
        return;
      }

      console.log('🚀 Déclenchement réponse IA avec prompt:', iaProfile.prompt_id);

      // Déclencher la réponse IA de manière asynchrone
      this.generateAIResponse(
        thread.id,
        thread.project_id,
        iaProfile,
        content,
        userMessage.sender_id
      ).catch(error => {
        console.error('❌ Erreur génération réponse IA:', error);
      });

    } catch (error) {
      console.error('❌ Erreur checkAndTriggerAIResponse:', error);
      // Ne pas faire échouer l'envoi du message si l'IA a un problème
    }
  }

  /**
   * Génère et envoie la réponse de l'IA
   */
  private static async generateAIResponse(
    threadId: string,
    projectId: string,
    iaProfile: any,
    userMessage: string,
    originalSenderId: string
  ): Promise<void> {
    try {
      console.log('🤖 Génération réponse IA dans thread:', threadId);

      // Récupérer l'historique de conversation (10 derniers messages pour plus de contexte)
      const { data: history } = await supabase
        .from('messages')
        .select('content, sender_name, sender_email, created_at')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Appeler l'Edge Function pour générer la réponse
      console.log('📤 Appel Edge Function ai-conversation-handler avec:', {
        promptId: iaProfile.prompt_id,
        projectId: projectId,
        messageLength: userMessage.length
      });

      const { data: aiResponse, error } = await supabase.functions.invoke('ai-conversation-handler', {
        body: {
          promptId: iaProfile.prompt_id,
          projectId: projectId,
          userMessage: userMessage,
          conversationHistory: history?.reverse() || []
        }
      });

      console.log('📥 Réponse Edge Function:', {
        success: aiResponse?.success,
        responseLength: aiResponse?.response?.length,
        error: error
      });

      if (error) throw error;

      // Récupérer le thread pour avoir les métadonnées
      const { data: thread } = await supabase
        .from('message_threads')
        .select('metadata')
        .eq('id', threadId)
        .single();

      const isPrivate = thread?.metadata?.type === 'private' || false;
      const participants = thread?.metadata?.participants?.map((p: any) => p.id) || null;

      // Vérifier si la réponse contient une commande de sauvegarde
      const responseContent = aiResponse?.response || "Je n'ai pas pu générer de réponse.";
      // Accepter différentes extensions : .docx, .pdf, .csv, .xlsx
      const saveMatch = responseContent.match(/\[SAVE_TO_DRIVE:\s*(.+?\.(docx|pdf|csv|xlsx))\]/i);

      console.log('🔍 Vérification sauvegarde Drive:', {
        hasMatch: !!saveMatch,
        fileName: saveMatch?.[1],
        contentLength: responseContent.length,
        containsSaveTag: responseContent.includes('[SAVE_TO_DRIVE:'),
        last100Chars: responseContent.slice(-100)
      });

      let finalContent = responseContent;
      let savedFileName = null;

      if (saveMatch) {
        // L'IA veut sauvegarder un document
        const fileName = saveMatch[1];
        savedFileName = fileName;

        // Retirer le tag du contenu visible
        finalContent = responseContent.replace(/\[SAVE_TO_DRIVE:.*?\]/, '').trim();

        // Récupérer le contenu complet depuis l'historique de conversation
        // Inclure le message actuel ET les messages précédents de l'IA
        const { data: conversationHistory } = await supabase
          .from('messages')
          .select('content, sender_id, created_at')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: false })
          .limit(10);

        let contentToSave = '';

        // Trouver le dernier message substantiel de l'IA (article, guide, etc.)
        if (conversationHistory && conversationHistory.length > 0) {
          // Chercher d'abord dans les messages de l'IA
          const iaMessages = conversationHistory.filter(msg => msg.sender_id === iaProfile.id);

          for (const msg of iaMessages) {
            // Si le message contient un document structuré (avec titres markdown)
            if (msg.content && msg.content !== finalContent) {
              if (msg.content.includes('# ') || msg.content.includes('## ') || msg.content.length > 800) {
                contentToSave = msg.content;
                console.log('📝 Contenu trouvé dans l\'historique:', msg.content.substring(0, 100));
                break;
              }
            }
          }
        }

        // Si on n'a pas trouvé de contenu dans l'historique, utiliser le contenu actuel
        if (!contentToSave) {
          contentToSave = finalContent;
          console.log('📝 Utilisation du contenu actuel');
        }

        console.log('💾 Sauvegarde Drive demandée:', fileName);
        console.log('📄 Longueur du contenu à sauvegarder:', contentToSave.length);
        console.log('🔨 Appel de saveAIContentToDrive avec:', {
          projectId,
          fileName,
          contentLength: contentToSave.length,
          aiMemberName: iaProfile.name
        });

        // Appeler la fonction de sauvegarde
        await this.saveAIContentToDrive(
          projectId,
          fileName,
          contentToSave,
          iaProfile.name
        ).catch(error => {
          console.error('❌ Erreur sauvegarde Drive:', error);
        });
      }

      // Envoyer la réponse de l'IA DANS LE MÊME THREAD
      await supabase
        .from('messages')
        .insert({
          thread_id: threadId, // IMPORTANT: même thread que le message utilisateur
          sender_id: iaProfile.id,
          sender_name: `${iaProfile.name}`,
          sender_email: `${iaProfile.name.toLowerCase().replace(/\s+/g, '_')}@ia.team`,
          content: finalContent, // Contenu sans le tag SAVE_TO_DRIVE
          metadata: {
            is_private: isPrivate,
            participants: participants,
            thread_type: thread?.metadata?.type || 'team',
            is_ai_response: true,
            tokens_used: aiResponse?.tokensUsed,
            file_saved: savedFileName
          }
        });

      console.log('✅ Réponse IA envoyée dans thread:', threadId);

    } catch (error) {
      console.error('❌ Erreur generateAIResponse:', error);

      // Envoyer un message d'erreur dans le thread
      await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: iaProfile.id,
          sender_name: iaProfile.name,
          sender_email: `${iaProfile.name.toLowerCase().replace(/\s+/g, '_')}@ia.team`,
          content: "❌ Désolé, je rencontre un problème technique. Veuillez réessayer.",
          metadata: {
            is_ai_error: true,
            error: error.message
          }
        });
    }
  }

  /**
   * Sauvegarde le contenu IA dans le Drive
   */
  private static async saveAIContentToDrive(
    projectId: string,
    fileName: string,
    content: string,
    aiMemberName: string
  ): Promise<void> {
    try {
      console.log('📁 [saveAIContentToDrive] Début sauvegarde:', {
        projectId,
        fileName,
        contentLength: content.length,
        aiMemberName
      });

      // Extraire le titre du nom de fichier (sans l'extension)
      const title = fileName.replace(/\.docx$/i, '');

      // Appeler l'Edge Function de sauvegarde qui générera le DOCX côté serveur
      const { data, error } = await supabase.functions.invoke('save-ai-content-to-drive', {
        body: {
          projectId,
          fileName,
          content: content, // Le markdown original sera converti en DOCX côté serveur
          contentType: 'document',
          aiMemberName,
          title: title, // Ajouter le titre pour la génération DOCX
          generateDocx: true // Indiquer qu'on veut générer un DOCX côté serveur
        }
      });

      if (error) {
        console.error('❌ [saveAIContentToDrive] Erreur Edge Function:', error);
        throw error;
      }

      console.log('✅ [saveAIContentToDrive] Réponse Edge Function:', data);
      console.log('🎯 Document devrait être sauvé dans Drive');

      // Envoyer un message de confirmation dans le thread
      // (Optionnel - on peut aussi juste logger)

    } catch (error) {
      console.error('❌ Erreur sauvegarde Drive:', error);
      throw error;
    }
  }


  /**
   * Attache des fichiers à un message
   */
  private static async attachFiles(messageId: string, files: any[], uploadedBy: string): Promise<void> {
    const attachments = files.map(file => ({
      message_id: messageId,
      file_name: file.name,
      file_path: file.path,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: uploadedBy
    }));

    await supabase
      .from('message_attachments')
      .insert(attachments);
  }

  /**
   * Récupère les messages d'un thread
   */
  static async getMessages(threadId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        message_attachments (*)
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Récupère les threads d'un projet
   */
  static async getThreads(projectId: string): Promise<Thread[]> {
    const { data, error } = await supabase
      .from('message_threads')
      .select('*')
      .eq('project_id', projectId)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}