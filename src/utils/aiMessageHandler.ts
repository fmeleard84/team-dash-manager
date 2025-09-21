import { supabase } from '@/integrations/supabase/client';
import { generateDocxBuffer, arrayBufferToBlob } from './docxGenerator';

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

export type UserIntent = 'document' | 'quick' | 'choice';

export interface AIResponseChoice {
  type: 'document' | 'message' | 'both';
  label: string;
  icon: string;
}

// Triggers pour détecter les intentions utilisateur
const AI_TRIGGERS = {
  // Demande explicite de document/livrable
  DOCUMENT: [
    'rédige un document',
    'crée un rapport',
    'génère un article',
    'prépare une présentation',
    'écris un blog',
    'fais un compte-rendu',
    'rédaction de',
    'création de document',
    'génération de rapport'
  ],

  // Questions rapides nécessitant une réponse directe
  QUICK: [
    'explique',
    'résume',
    'qu\'est-ce que',
    'comment',
    'pourquoi',
    'liste',
    'définis',
    'c\'est quoi',
    'dis-moi'
  ],

  // Demandes ambiguës nécessitant un choix
  CHOICE: [
    'peux-tu',
    'pourrais-tu',
    'j\'aimerais',
    'je voudrais',
    'serait-il possible',
    'aide-moi'
  ]
};

/**
 * Analyse l'intention de l'utilisateur basée sur son message
 */
export const analyzeUserIntent = (message: string): UserIntent => {
  const lower = message.toLowerCase();

  // Vérifier d'abord les demandes explicites de documents
  if (AI_TRIGGERS.DOCUMENT.some(trigger => lower.includes(trigger))) {
    return 'document';
  }

  // Vérifier si c'est une question simple nécessitant une réponse rapide
  if (AI_TRIGGERS.QUICK.some(trigger => lower.startsWith(trigger))) {
    return 'quick';
  }

  // Par défaut, proposer un choix si ambiguë ou longue demande
  if (message.length > 100 || AI_TRIGGERS.CHOICE.some(trigger => lower.includes(trigger))) {
    return 'choice';
  }

  // Pour les messages courts sans trigger spécifique, réponse rapide
  return 'quick';
};

/**
 * Détermine si le contenu généré devrait être un document
 */
export const shouldCreateDocument = (content: string, userRequest: string): boolean => {
  const contentLength = content.split(' ').length;
  const hasDocumentRequest = AI_TRIGGERS.DOCUMENT.some(trigger =>
    userRequest.toLowerCase().includes(trigger)
  );

  // Document si explicitement demandé ou si le contenu est très long
  return hasDocumentRequest || contentLength > 500;
};

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
  projectMembers: any[],
  threadId: string  // Ajout du threadId pour utiliser le bon thread (privé ou général)
): Promise<AIConversationContext | null> => {
  try {
    // Gestion du préfixe 'ia_' si présent
    const aiMember = projectMembers.find(m => {
      return (m.id === aiMemberId || m.id === `ia_${aiMemberId}` || `ia_${m.id}` === aiMemberId) && m.isAI;
    });

    if (!aiMember) {
      console.error('❌ Membre IA non trouvé:', aiMemberId);
      console.error('Membres disponibles:', projectMembers.map(m => ({ id: m.id, name: m.name, isAI: m.isAI })));
      return null;
    }

    if (!aiMember.promptId) {
      console.error('❌ Membre IA sans prompt_id:', aiMember);
      return null;
    }

    // Utiliser le threadId fourni (qui est maintenant le thread privé correct)
    console.log('🔍 Utilisation du thread:', threadId);

    // Récupérer les derniers messages de la conversation dans CE thread spécifique
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
    console.log('💬 Message utilisateur:', userMessage);
    console.log('📁 Contexte:', {
      projectId: context.projectId,
      memberId: context.memberId,
      historyLength: context.conversationHistory.length
    });

    // Appel à l'Edge Function pour générer la vraie réponse IA
    const { data, error } = await supabase.functions.invoke('ai-conversation-handler', {
      body: {
        promptId: context.promptId,
        projectId: context.projectId,
        userMessage: userMessage,
        conversationHistory: context.conversationHistory.slice(0, 5)
      }
    });

    if (error) {
      console.error('❌ Erreur génération IA:', error);
      return null;
    }

    if (!data || !data.success) {
      console.error('❌ Réponse IA échouée:', data?.error);
      return null;
    }

    console.log('✅ Réponse IA générée avec succès');
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
 * Formate une réponse IA avec des options de choix
 */
export const formatAIResponseWithChoices = (
  aiResponse: string,
  intent: UserIntent,
  projectId: string
): string => {
  // Si réponse rapide, retourner directement
  if (intent === 'quick') {
    return aiResponse;
  }

  // Si document explicite, ajouter une note sur la sauvegarde
  if (intent === 'document') {
    return `${aiResponse}\n\n📄 *Ce contenu a été automatiquement sauvegardé dans le Drive du projet (dossier IA).*`;
  }

  // Pour les cas ambigus, proposer les choix
  const preview = aiResponse.length > 200
    ? `${aiResponse.substring(0, 200)}...`
    : aiResponse;

  return `${preview}\n\n---\n\n**Comment souhaitez-vous recevoir la réponse complète ?**\n\n📄 **Option 1** : Document Word dans le Drive (pour archivage et partage)\n💬 **Option 2** : Réponse complète ici dans la messagerie\n📋 **Option 3** : Les deux (document + message)\n\n*Répondez avec le numéro de votre choix (1, 2 ou 3)*`;
};

/**
 * Traite le choix de l'utilisateur pour le format de réponse
 */
export const processUserChoice = async (
  choice: string,
  previousResponse: string,
  projectId: string,
  aiMemberName: string
): Promise<string> => {
  const choiceNum = choice.trim();

  switch (choiceNum) {
    case '1':
      // Sauvegarder dans Drive uniquement
      const detection1 = detectAIContent(previousResponse);
      const saved1 = await saveAIContentToDrive(
        previousResponse,
        { ...detection1, shouldSaveToDrive: true },
        projectId,
        aiMemberName
      );
      return saved1
        ? '✅ Document créé et sauvegardé dans le Drive (dossier IA) !'
        : '❌ Erreur lors de la sauvegarde. Veuillez réessayer.';

    case '2':
      // Afficher dans la messagerie uniquement
      return previousResponse;

    case '3':
      // Les deux
      const detection3 = detectAIContent(previousResponse);
      const saved3 = await saveAIContentToDrive(
        previousResponse,
        { ...detection3, shouldSaveToDrive: true },
        projectId,
        aiMemberName
      );
      return saved3
        ? `${previousResponse}\n\n✅ *Document également sauvegardé dans le Drive (dossier IA).*`
        : `${previousResponse}\n\n⚠️ *Impossible de sauvegarder dans le Drive.*`;

    default:
      return 'Veuillez répondre avec 1, 2 ou 3 pour choisir le format de réponse.';
  }
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
    const fileName = `${timestamp}_${detection.contentType}_${aiMemberName.replace(/\s+/g, '_')}.docx`;

    console.log('📄 Génération du document DOCX pour le contenu IA...');

    // Générer le document DOCX
    const docxBuffer = await generateDocxBuffer({
      title: detection.title || 'Contenu généré par IA',
      author: aiMemberName,
      projectId: projectId,
      contentType: detection.contentType,
      content: content
    });

    // Convertir en Blob pour l'upload
    const docxBlob = arrayBufferToBlob(docxBuffer);

    console.log('💾 Sauvegarde document DOCX dans Drive:', fileName);

    // Upload direct dans le storage Supabase
    const folderPath = `projects/${projectId}/IA/`;
    const fullPath = `${folderPath}${fileName}`;

    // Créer le dossier IA s'il n'existe pas
    const { error: uploadError } = await supabase.storage
      .from('project_files')
      .upload(fullPath, docxBlob, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError && uploadError.message.includes('duplicate')) {
      // Si le fichier existe déjà, ajouter un timestamp unique
      const uniqueFileName = `${timestamp}_${Date.now()}_${detection.contentType}_${aiMemberName.replace(/\s+/g, '_')}.docx`;
      const uniqueFullPath = `${folderPath}${uniqueFileName}`;

      const { error: retryError } = await supabase.storage
        .from('project_files')
        .upload(uniqueFullPath, docxBlob, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          cacheControl: '3600',
          upsert: false
        });

      if (retryError) {
        console.error('❌ Erreur upload DOCX:', retryError);
        return false;
      }

      console.log('✅ Document DOCX sauvegardé avec nom unique:', uniqueFullPath);
      return true;
    }

    if (uploadError) {
      console.error('❌ Erreur upload DOCX:', uploadError);
      return false;
    }

    console.log('✅ Document DOCX sauvegardé:', fullPath);
    return true;

  } catch (error) {
    console.error('❌ Erreur sauvegarde IA:', error);
    return false;
  }
};

/**
 * Gestionnaire principal pour les messages IA avec détection d'intentions
 */
export const handleAIConversation = async (
  selectedConversation: any,
  userMessage: string,
  projectId: string,
  projectMembers: any[],
  threadId: string,
  lastAIResponse?: string, // Pour traiter les choix utilisateur
  currentUserId?: string   // ID de l'utilisateur qui pose la question
): Promise<{ success: boolean; aiResponse?: string; saved?: boolean }> => {
  try {
    if (!isMessageToAI(selectedConversation, projectMembers)) {
      return { success: false };
    }

    console.log('🤖 Traitement conversation IA pour:', selectedConversation.name);

    const aiMember = projectMembers.find(m => m.id === selectedConversation.id);
    if (!aiMember) {
      console.error('❌ Membre IA non trouvé');
      return { success: false };
    }

    // Vérifier si c'est un choix de format (1, 2 ou 3)
    if (lastAIResponse && /^[123]$/.test(userMessage.trim())) {
      console.log('📊 Traitement du choix utilisateur:', userMessage);
      const processedResponse = await processUserChoice(
        userMessage,
        lastAIResponse,
        projectId,
        aiMember.name
      );

      // Envoyer la réponse traitée
      const realIaId = aiMember.id.startsWith('ia_') ? aiMember.id.replace('ia_', '') : aiMember.id;
      await supabase.from('messages').insert({
        thread_id: threadId,
        content: processedResponse,
        sender_id: realIaId,
        sender_email: aiMember.email,
        sender_name: aiMember.name
      });

      return { success: true, aiResponse: processedResponse, saved: userMessage === '1' || userMessage === '3' };
    }

    // 1. Analyser l'intention de l'utilisateur
    const intent = analyzeUserIntent(userMessage);
    console.log('🎯 Intention détectée:', intent);

    // 2. Récupérer le contexte IA
    console.log('📝 Récupération du contexte pour:', selectedConversation.id);
    console.log('📝 Membres du projet:', projectMembers.map(m => ({ id: m.id, name: m.name, isAI: m.isAI, promptId: m.promptId })));

    const context = await getAIConversationContext(
      selectedConversation.id,
      projectId,
      projectMembers,
      threadId  // Passer le threadId qui est maintenant le thread privé correct
    );

    if (!context) {
      console.error('❌ Impossible de récupérer le contexte IA');
      console.error('ID recherché:', selectedConversation.id);
      console.error('Membres IA:', projectMembers.filter(m => m.isAI));
      return { success: false };
    }
    console.log('✅ Contexte récupéré:', context);

    // 3. Générer la réponse IA
    const aiResponse = await generateAIResponse(context, userMessage);

    if (!aiResponse) {
      console.error('❌ Aucune réponse IA générée');
      return { success: false };
    }

    // 4. Traiter selon l'intention
    let finalResponse = aiResponse;
    let saved = false;

    if (intent === 'document') {
      // Sauvegarder automatiquement pour les demandes explicites de documents
      const detection = detectAIContent(aiResponse);
      saved = await saveAIContentToDrive(
        aiResponse,
        { ...detection, shouldSaveToDrive: true },
        projectId,
        aiMember.name
      );

      const timestamp = new Date().toISOString().slice(0, 10);
      const docxFileName = `${timestamp}_${detection.contentType}_${aiMember.name.replace(/\s+/g, '_')}.docx`;

      finalResponse = `${aiResponse}\n\n📄 *Document sauvegardé dans le Drive du projet : ${docxFileName}*`;
    } else if (intent === 'choice') {
      // Formater avec les options de choix
      finalResponse = formatAIResponseWithChoices(aiResponse, intent, projectId);
    }
    // Si intent === 'quick', on garde aiResponse tel quel

    // 5. IMPORTANT: Créer/récupérer le thread privé pour cet utilisateur et cette IA
    const realIaId = aiMember.id.startsWith('ia_') ? aiMember.id.replace('ia_', '') : aiMember.id;

    // Récupérer ou créer le thread privé pour l'utilisateur actuel
    let privateThreadId = threadId; // Par défaut, utiliser le thread passé

    if (currentUserId) {
      // Importer PrivateThreadManager inline pour éviter les dépendances circulaires
      const { PrivateThreadManager } = await import('./privateThreadManager');

      // Préparer les informations des participants
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', currentUserId)
        .single();

      const currentUser = {
        id: currentUserId,
        name: userProfile
          ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email
          : '',
        email: userProfile?.email || ''
      };

      const iaParticipant = {
        id: realIaId,
        name: aiMember.name,
        email: `${aiMember.name.toLowerCase().replace(/\s+/g, '_')}@ia.team`,
        isAI: true
      };

      // Créer/récupérer le thread privé entre cet utilisateur et l'IA
      const newPrivateThreadId = await PrivateThreadManager.getOrCreatePrivateThread(
        projectId,
        currentUser,
        iaParticipant
      );

      if (newPrivateThreadId) {
        console.log('🔐 Utilisation du thread privé:', newPrivateThreadId);
        privateThreadId = newPrivateThreadId;
      } else {
        console.warn('⚠️ Impossible de créer le thread privé, utilisation du thread original');
      }
    }

    const { data: insertedMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: privateThreadId, // Utiliser le thread privé !
        content: finalResponse,      // Plus besoin de préfixe [TO:] car c'est privé
        sender_id: realIaId,
        sender_email: aiMember.email,
        sender_name: aiMember.name
        // Removed metadata field - not supported by database schema
      })
      .select()
      .single();

    if (messageError) {
      console.error('❌ Erreur envoi message IA:', messageError);
      return { success: false };
    }

    console.log('✅ Message IA inséré avec succès:', insertedMessage?.id);
    console.log('✅ Conversation IA traitée avec succès (intention:', intent, ')');
    return { success: true, aiResponse: finalResponse, saved, message: insertedMessage };

  } catch (error) {
    console.error('❌ Erreur traitement conversation IA:', error);
    return { success: false };
  }
};