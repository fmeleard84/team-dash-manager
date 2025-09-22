import { supabase } from '@/integrations/supabase/client';

export interface ProjectMember {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'client' | 'candidate';
}

export const initializeProjectMessaging = async (projectId: string): Promise<string | null> => {
  try {
    console.log('🔄 Initializing messaging for project:', projectId);

    // First check if messaging tables exist
    const { error: tableCheckError } = await supabase
      .from('message_threads')
      .select('count')
      .limit(0);

    if (tableCheckError) {
      console.warn('⚠️ Messaging tables do not exist:', tableCheckError.message);
      throw new Error('Messaging system not yet configured. Please contact administrator.');
    }

    // 1. Récupérer les détails du projet
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('title, owner_id')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // 2. Récupérer les membres de l'équipe (candidats confirmés)
    const { data: projectBookings, error: bookingsError } = await supabase
      .from('project_bookings')
      .select(`
        candidate_id,
        candidate_profiles!inner (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('project_id', projectId)
      .eq('status', 'accepted');

    if (bookingsError) throw bookingsError;

    // 3. Récupérer le propriétaire du projet
    const { data: ownerProfile, error: ownerError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', project.owner_id)
      .single();

    if (ownerError) throw ownerError;

    // 4. Vérifier s'il existe déjà un thread principal pour ce projet
    const { data: existingThread, error: threadCheckError } = await supabase
      .from('message_threads')
      .select('id, metadata')
      .eq('project_id', projectId)
      .or('metadata->type.eq.team,metadata.is.null') // Thread principal seulement
      .single();

    if (threadCheckError && threadCheckError.code !== 'PGRST116') {
      throw threadCheckError;
    }

    let threadId: string;

    if (existingThread) {
      threadId = existingThread.id;
      console.log('✅ Thread already exists:', threadId);
    } else {
      // 5. Créer le thread principal de l'équipe
      const { data: newThread, error: createThreadError } = await supabase
        .from('message_threads')
        .insert({
          project_id: projectId,
          title: `Équipe ${project.title}`,
          description: 'Conversation principale de l\'équipe du projet',
          created_by: ownerProfile.id,
          last_message_at: new Date().toISOString(),
          is_active: true,
          metadata: { type: 'team' } // Marquer explicitement comme thread principal
        })
        .select()
        .single();

      if (createThreadError) throw createThreadError;
      threadId = newThread.id;
      console.log('✅ Thread created:', threadId);
    }

    // 6. Préparer la liste des participants
    const participants = [];

    // Ajouter le propriétaire du projet
    participants.push({
      thread_id: threadId,
      user_id: ownerProfile.id,
      email: ownerProfile.email,
      name: `${ownerProfile.first_name || ''} ${ownerProfile.last_name || ''}`.trim() || ownerProfile.email,
      role: 'client' as const,
      joined_at: new Date().toISOString(),
      is_active: true
    });

    // Ajouter les candidats
    (projectBookings || []).forEach((booking: any) => {
      if (booking.candidate_profiles) {
        participants.push({
          thread_id: threadId,
          user_id: booking.candidate_profiles.id,
          email: booking.candidate_profiles.email,
          name: `${booking.candidate_profiles.first_name || ''} ${booking.candidate_profiles.last_name || ''}`.trim() || booking.candidate_profiles.email,
          role: 'candidate' as const,
          joined_at: new Date().toISOString(),
          is_active: true
        });
      }
    });

    // 7. Ajouter/mettre à jour les participants avec upsert
    if (participants.length > 0) {
      const { error: participantsError } = await supabase
        .from('message_participants')
        .upsert(participants, { 
          onConflict: 'thread_id,email',
          ignoreDuplicates: false 
        });

      if (participantsError) throw participantsError;
    }

    console.log('✅ Messaging initialized with', participants.length, 'participants');
    return threadId;

  } catch (error) {
    console.error('❌ Error initializing project messaging:', error);
    throw error;
  }
};

export const sendMessage = async (
  threadId: string,
  content: string,
  attachments: Array<{ name: string; url: string; path: string; size: number; type: string }> = [],
  recipientId?: string,
  projectId?: string
): Promise<any> => {
  try {
    // Récupérer l'utilisateur actuel
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Récupérer le profil de l'utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    
    // Removed position query - column doesn't exist in database

    // Use only first name for sender_name (job title will be shown separately in UI)
    const senderName = profile.first_name || profile.email.split('@')[0];

    // Créer le message sans job_title
    const displayName = senderName;

    // Préparer les métadonnées pour les messages privés
    const messageMetadata: any = {};

    // Si c'est un message privé (recipientId défini), marquer comme privé
    if (recipientId) {
      // Pour les messages privés, stocker les participants
      const realRecipientId = recipientId.startsWith('ia_')
        ? recipientId.replace('ia_', '')
        : recipientId;

      messageMetadata.is_private = true;
      messageMetadata.participants = [user.id, realRecipientId];
      messageMetadata.thread_type = 'private';
    } else {
      // Message d'équipe
      messageMetadata.is_private = false;
      messageMetadata.thread_type = 'team';
    }

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        sender_id: user.id,
        sender_name: displayName, // Inclut le métier temporairement
        sender_email: profile.email,
        content: content,
        is_edited: false,
        metadata: messageMetadata // Ajouter les métadonnées pour l'isolation
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // Ajouter les pièces jointes si il y en a
    if (attachments.length > 0) {
      const attachmentData = attachments.map(att => ({
        message_id: message.id,
        file_name: att.name,
        file_path: att.path,
        file_type: att.type,
        file_size: att.size,
        uploaded_by: user.id
      }));

      const { error: attachmentError } = await supabase
        .from('message_attachments')
        .insert(attachmentData);

      if (attachmentError) throw attachmentError;
    }

    // Mettre à jour le timestamp du thread
    await supabase
      .from('message_threads')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', threadId);

    console.log('✅ Message sent successfully');

    // Vérifier si le message doit déclencher une réponse IA
    // 1. Si recipientId est défini (conversation privée) → l'IA répond toujours
    // 2. Si pas de recipientId (canal général) → vérifier si l'IA est mentionnée

    let shouldAIRespond = false;
    let targetIAProfile = null;

    if (recipientId && recipientId.startsWith('ia_')) {
      // Conversation privée avec l'IA
      shouldAIRespond = true;
      const realProfileId = recipientId.replace('ia_', '');

      const { data: iaProfile } = await supabase
        .from('hr_profiles')
        .select('id, name, prompt_id')  // Ajouter 'id' dans le select
        .eq('id', realProfileId)
        .eq('is_ai', true)
        .single();

      targetIAProfile = iaProfile;

      // S'assurer que l'ID est bien défini
      if (targetIAProfile) {
        targetIAProfile.id = realProfileId;  // Forcer l'ID si nécessaire
      }
    } else if (!recipientId) {
      // Canal général - vérifier si l'IA est mentionnée
      const contentLower = content.toLowerCase();

      // Récupérer toutes les IA du projet
      const { data: projectIA } = await supabase
        .from('hr_resource_assignments')
        .select(`
          profile_id,
          hr_profiles!inner (
            id,
            name,
            prompt_id,
            is_ai
          )
        `)
        .eq('project_id', projectId)
        .eq('hr_profiles.is_ai', true);

      // Vérifier si une IA est mentionnée
      for (const assignment of projectIA || []) {
        const iaName = assignment.hr_profiles.name.toLowerCase();

        // Patterns pour détecter une mention
        if (
          contentLower.includes(`@${iaName}`) ||
          contentLower.includes(`@ia`) ||
          contentLower.startsWith(`${iaName},`) ||
          contentLower.includes(`bonjour ${iaName}`) ||
          contentLower.includes(`salut ${iaName}`) ||
          (contentLower.includes('ia') && contentLower.includes('?')) // Question directe à l'IA
        ) {
          shouldAIRespond = true;
          targetIAProfile = assignment.hr_profiles;
          recipientId = `ia_${assignment.hr_profiles.id}`; // Pour le traitement
          break;
        }
      }
    }

    // Si l'IA doit répondre
    if (shouldAIRespond && targetIAProfile && projectId) {
      console.log('🤖 L\'IA doit répondre:', {
        iaName: targetIAProfile.name,
        inPrivate: !!recipientId,
        message: content.substring(0, 50)
      });

      try {
        // Extraire l'ID réel du profil IA depuis recipientId
        const realProfileId = recipientId?.startsWith('ia_')
          ? recipientId.replace('ia_', '')
          : targetIAProfile?.id;

        // Vérifier que realProfileId est bien défini
        if (!realProfileId) {
          console.error('❌ Profile ID de l\'IA non défini', {
            targetIAProfile,
            recipientId,
            targetIAProfileId: targetIAProfile?.id
          });
          return message; // Retourner le message envoyé même si l'IA ne peut pas répondre
        }

        if (targetIAProfile?.prompt_id) {
          // Vérifier d'abord si c'est une réponse à un choix précédent
          const { data: lastMessages } = await supabase
            .from('messages')
            .select('metadata')
            .eq('thread_id', threadId)
            .eq('sender_id', realProfileId)
            .order('created_at', { ascending: false })
            .limit(1);

          const lastMessage = lastMessages?.[0];
          const isWaitingForChoice = lastMessage?.metadata?.type === 'ai_choice_request';

          if (isWaitingForChoice) {
            // Traiter la réponse au choix
            const userChoice = content.trim().toLowerCase();
            const wantsDocument = userChoice === '1' || userChoice.includes('livrable') || userChoice.includes('document');
            const wantsDirect = userChoice === '2' || userChoice.includes('direct') || userChoice.includes('immédiat');

            if (wantsDocument || wantsDirect) {
              // Récupérer le message original depuis les métadonnées
              const originalMessage = lastMessage.metadata.original_message;

              // Envoyer un message de confirmation
              const confirmMessage = wantsDocument
                ? '📄 Parfait ! Je vais créer un document Word et le sauvegarder dans votre Drive. Un instant...'
                : '💬 Très bien ! Je vais vous répondre directement ici. Un instant...';

              // Préparer les métadonnées pour le message de confirmation
              const confirmMetadata: any = {};
              if (recipientId) {
                confirmMetadata.is_private = true;
                confirmMetadata.participants = [realProfileId, user.id];
                confirmMetadata.thread_type = 'private';
              } else {
                confirmMetadata.is_private = false;
                confirmMetadata.thread_type = 'team';
              }

              await supabase
                .from('messages')
                .insert({
                  thread_id: threadId,
                  sender_id: realProfileId,
                  sender_name: `${targetIAProfile.name} (IA)`,
                  sender_email: `${targetIAProfile.name.toLowerCase().replace(/\s+/g, '_')}@ia.team`,
                  content: confirmMessage,
                  is_edited: false,
                  metadata: confirmMetadata
                });

              // Traiter la demande originale
              // Passer l'info que c'est une conversation privée
              const isPrivate = !!recipientId;
              await handleAIResponse(threadId, realProfileId, targetIAProfile, originalMessage, projectId, wantsDocument, isPrivate, user.id);
            } else {
              // Réponse non valide, redemander
              await supabase
                .from('messages')
                .insert({
                  thread_id: threadId,
                  sender_id: realProfileId,
                  sender_name: `${targetIAProfile.name} (IA)`,
                  sender_email: `${targetIAProfile.name.toLowerCase().replace(/\s+/g, '_')}@ia.team`,
                  content: '❓ Je n\'ai pas compris votre choix. Veuillez répondre avec "1" ou "livrable" pour un document, ou "2" ou "direct" pour une réponse immédiate.',
                  is_edited: false,
                  metadata: lastMessage.metadata // Conserver les métadonnées pour le prochain essai
                });
            }
          } else {
            // Analyser le message pour détecter si c'est une demande de création
            const isCreationRequest = content.toLowerCase().includes('article') ||
                                     content.toLowerCase().includes('document') ||
                                     content.toLowerCase().includes('créer') ||
                                     content.toLowerCase().includes('rédiger') ||
                                     content.toLowerCase().includes('écrire');

            // Si c'est potentiellement une demande de création, demander le choix
            if (isCreationRequest) {
              // Créer un message de demande de choix
              const choiceMessage = await supabase
                .from('messages')
                .insert({
                  thread_id: threadId,
                  sender_id: realProfileId,
                  sender_name: `${targetIAProfile.name} (IA)`,
                  sender_email: `${targetIAProfile.name.toLowerCase().replace(/\s+/g, '_')}@ia.team`,
                  content: `📝 Je détecte une demande de création de contenu.\n\nComment souhaitez-vous recevoir le résultat ?\n\n1️⃣ **Livrable** : Je créerai un document Word dans votre Drive (dossier IA)\n2️⃣ **Réponse immédiate** : Je vous réponds directement ici\n\nRépondez avec "1" ou "livrable" pour un document, ou "2" ou "direct" pour une réponse immédiate.`,
                  is_edited: false,
                  metadata: {
                    type: 'ai_choice_request',
                    original_message: content,
                    prompt_id: targetIAProfile.prompt_id,
                    project_id: projectId
                  }
                })
                .select()
                .single();

              console.log('🤖 Message de choix envoyé');
            } else {
              // Pour les messages simples, répondre directement
              const isPrivate = !!recipientId;
              await handleAIResponse(threadId, realProfileId, targetIAProfile, content, projectId, false, isPrivate, user.id);
            }
          }
        }
      } catch (aiError) {
        console.error('❌ Erreur lors du traitement IA:', aiError);
        // Ne pas faire échouer l'envoi du message original
      }
    }

    // Return the created message so it can be added immediately to the UI
    return message;

  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
};

// Fonction helper pour gérer la réponse IA
async function handleAIResponse(
  threadId: string,
  iaProfileId: string,
  iaProfile: any,
  userMessage: string,
  projectId: string,
  createDocument: boolean,
  isPrivateConversation: boolean = false,
  originalSenderId?: string
) {
  try {
    // Récupérer l'historique de conversation (3 derniers messages)
    const { data: conversationHistory } = await supabase
      .from('messages')
      .select('content, sender_name, sender_email, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(3);

    // Appeler l'Edge Function pour générer la réponse
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-conversation-handler', {
      body: {
        promptId: iaProfile.prompt_id,
        projectId: projectId,
        userMessage: userMessage,
        conversationHistory: conversationHistory?.reverse() || [],
        requestType: createDocument ? 'document' : 'conversation'
      }
    });

    if (aiError) throw aiError;

    // Si c'est un document, le sauvegarder dans le Drive
    if (createDocument && aiResponse?.response) {
      const { data: saveResult } = await supabase.functions.invoke('save-ai-content-to-drive', {
        body: {
          projectId: projectId,
          content: aiResponse.response,
          fileName: `${iaProfile.name}_${new Date().toISOString().split('T')[0]}`,
          iaName: iaProfile.name
        }
      });

      // Créer le message avec le lien vers le document
      const documentMessage = saveResult?.fileUrl
        ? `📄 Document créé avec succès !\n\nVotre document a été sauvegardé dans le Drive du projet (dossier IA).\n\n[Télécharger le document](${saveResult.fileUrl})\n\n---\n\n${aiResponse.response.substring(0, 500)}...`
        : `📄 Document créé :\n\n${aiResponse.response}`;

      // Préparer les métadonnées avec info de conversation privée
      const responseMetadata: any = {
        type: 'ai_document_response',
        document_url: saveResult?.fileUrl,
        tokens_used: aiResponse.tokensUsed
      };

      if (isPrivateConversation && originalSenderId) {
        responseMetadata.is_private = true;
        responseMetadata.participants = [iaProfileId, originalSenderId];
        responseMetadata.thread_type = 'private';
      } else {
        responseMetadata.is_private = false;
        responseMetadata.thread_type = 'team';
      }

      await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: iaProfileId,
          sender_name: `${iaProfile.name} (IA)`,
          sender_email: `${iaProfile.name.toLowerCase().replace(/\s+/g, '_')}@ia.team`,
          content: documentMessage,
          is_edited: false,
          metadata: responseMetadata
        });
    } else {
      // Réponse directe dans la conversation
      // Préparer les métadonnées avec info de conversation privée
      const responseMetadata: any = {
        type: 'ai_response',
        tokens_used: aiResponse?.tokensUsed
      };

      if (isPrivateConversation && originalSenderId) {
        responseMetadata.is_private = true;
        responseMetadata.participants = [iaProfileId, originalSenderId];
        responseMetadata.thread_type = 'private';
      } else {
        responseMetadata.is_private = false;
        responseMetadata.thread_type = 'team';
      }

      await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: iaProfileId,
          sender_name: `${iaProfile.name} (IA)`,
          sender_email: `${iaProfile.name.toLowerCase().replace(/\s+/g, '_')}@ia.team`,
          content: aiResponse?.response || 'Je suis désolé, je n\'ai pas pu générer une réponse.',
          is_edited: false,
          metadata: responseMetadata
        });
    }

    console.log('✅ Réponse IA envoyée');
  } catch (error) {
    console.error('❌ Erreur handleAIResponse:', error);

    // Envoyer un message d'erreur
    await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        sender_id: iaProfileId,
        sender_name: `${iaProfile.name} (IA)`,
        sender_email: `${iaProfile.name.toLowerCase().replace(/\s+/g, '_')}@ia.team`,
        content: '❌ Désolé, je rencontre un problème technique. Veuillez réessayer plus tard.',
        is_edited: false,
        metadata: {
          type: 'ai_error',
          error: error.message
        }
      });
  }
}