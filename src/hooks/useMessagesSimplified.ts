import { useState, useEffect, useCallback } from 'react';
import { MessageService, Thread, Message } from '@/services/MessageService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook simplifié pour la messagerie
 * Utilise le service unifié MessageService
 */
export const useMessagesSimplified = (projectId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Charger les threads du projet
  const loadThreads = useCallback(async () => {
    if (!projectId) return;

    try {
      const projectThreads = await MessageService.getThreads(projectId);
      setThreads(projectThreads);

      // Sélectionner automatiquement le thread public si aucun n'est sélectionné
      if (!selectedThreadId && projectThreads.length > 0) {
        const publicThread = projectThreads.find(t =>
          t.metadata?.type === 'team' || !t.metadata?.type
        );
        if (publicThread) {
          setSelectedThreadId(publicThread.id);
        }
      }
    } catch (error) {
      console.error('Erreur chargement threads:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les conversations"
      });
    }
  }, [projectId, selectedThreadId, toast]);

  // Charger les messages du thread sélectionné
  const loadMessages = useCallback(async () => {
    if (!selectedThreadId) {
      setMessages([]);
      return;
    }

    try {
      const threadMessages = await MessageService.getMessages(selectedThreadId);
      // Déduplication lors du chargement initial
      const uniqueMessages = threadMessages.filter((msg, index, self) =>
        index === self.findIndex((m) => m.id === msg.id)
      );
      setMessages(uniqueMessages);
    } catch (error) {
      console.error('Erreur chargement messages:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les messages"
      });
    }
  }, [selectedThreadId, toast]);

  // Envoyer un message
  const sendMessage = useCallback(async (content: string, attachments?: any[]) => {
    if (!selectedThreadId || !content.trim() || !user) return;

    setSending(true);
    try {
      // Récupérer les infos utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      const senderName = profile
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
        : user.email || 'Utilisateur';

      // Envoyer via le service unifié
      const message = await MessageService.sendMessage(
        selectedThreadId,
        content,
        user.id,
        senderName,
        user.email || '',
        attachments
      );

      // Ajouter immédiatement le message à la liste locale (avec vérification de duplication)
      setMessages(prev => {
        const exists = prev.some(m => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });

      return message;
    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'envoyer le message"
      });
    } finally {
      setSending(false);
    }
  }, [selectedThreadId, user, toast]);

  // Créer ou récupérer un thread privé
  const getOrCreatePrivateThread = useCallback(async (participants: any[]) => {
    if (!projectId || !user) return null;

    try {
      // Passer l'ID de l'utilisateur actuel pour created_by
      const threadId = await MessageService.getOrCreateThread(
        projectId,
        participants,
        user.id
      );

      // Recharger les threads
      await loadThreads();

      return threadId;
    } catch (error) {
      console.error('Erreur création thread privé:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer la conversation privée"
      });
      return null;
    }
  }, [projectId, user, loadThreads, toast]);

  // Configurer le realtime
  useEffect(() => {
    if (!selectedThreadId) return;

    console.log('🔄 Configuration realtime pour thread:', selectedThreadId);

    // S'abonner aux nouveaux messages
    const channel = supabase
      .channel(`messages-${selectedThreadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${selectedThreadId}`
        },
        (payload) => {
          console.log('📨 Nouveau message reçu:', payload.new);
          const newMessage = payload.new as Message;

          // Ajouter le message s'il n'existe pas déjà (vérification robuste)
          setMessages(prev => {
            // Vérifier si le message existe déjà par ID
            const existingIndex = prev.findIndex(m => m.id === newMessage.id);

            if (existingIndex >= 0) {
              // Si le message existe, le remplacer (au cas où il a été mis à jour)
              const updated = [...prev];
              updated[existingIndex] = newMessage;
              return updated;
            }

            // Sinon, l'ajouter à la fin
            return [...prev, newMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${selectedThreadId}`
        },
        (payload) => {
          console.log('✏️ Message mis à jour:', payload.new);
          const updatedMessage = payload.new as Message;

          // Mettre à jour le message existant
          setMessages(prev => prev.map(m =>
            m.id === updatedMessage.id ? updatedMessage : m
          ));
        }
      )
      .subscribe();

    return () => {
      console.log('🛑 Nettoyage realtime');
      supabase.removeChannel(channel);
    };
  }, [selectedThreadId]);

  // Charger les données initiales
  useEffect(() => {
    setLoading(true);
    loadThreads().finally(() => setLoading(false));
  }, [projectId, loadThreads]);

  // Charger les messages quand le thread change
  useEffect(() => {
    loadMessages();
  }, [selectedThreadId, loadMessages]);

  return {
    // État
    threads,
    messages,
    selectedThreadId,
    loading,
    sending,

    // Actions
    setSelectedThreadId,
    sendMessage,
    getOrCreatePrivateThread,
    refreshThreads: loadThreads,
    refreshMessages: loadMessages,

    // Setters directs pour le realtime
    setMessages,
    setThreads
  };
};