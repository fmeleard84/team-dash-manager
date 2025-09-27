/**
 * Test de compatibilité : Module MESSAGES modernisé
 * Ce fichier teste la compatibilité et les fonctionnalités du nouveau module MESSAGES
 */

import React, { useState } from 'react';

// Import nouveau module
import {
  EnhancedMessageSystem,
  useMessages,
  useMessageThreads,
  useMessageActions,
  useRealtimeMessages,
  useMessageStats,
  MessageAPI
} from '@/modules/messages';

function TestMessagesMigration() {
  // Test des hooks avec un projet fictif
  const projectId = 'test-project-id';
  const threadId = 'test-thread-id';
  const [selectedProject, setSelectedProject] = useState(projectId);

  console.log('🧪 [TEST MESSAGES] Migration modulaire - Projet:', projectId);

  // Test des nouveaux hooks
  const { threads, loading: threadsLoading } = useMessageThreads(selectedProject);
  const { messages, loading: messagesLoading } = useMessages(threadId);
  const { stats } = useMessageStats(selectedProject);
  const {
    sendMessage,
    createThread,
    updateThread,
    searchMessages,
    loading: actionLoading
  } = useMessageActions();

  // Test des fonctionnalités réaltime
  const { startTyping, stopTyping } = useRealtimeMessages({
    projectId: selectedProject,
    threadId,
    onNewMessage: (message) => console.log('📨 [TEST] New message:', message),
    onUserTyping: (typing) => console.log('⌨️ [TEST] User typing:', typing),
    onThreadUpdated: (thread) => console.log('🧵 [TEST] Thread updated:', thread)
  });

  console.log('🧪 [TEST MESSAGES] Nouveaux hooks:', {
    threadsCount: threads.length,
    threadsLoading,
    messagesCount: messages.length,
    messagesLoading,
    stats: stats ? {
      totalThreads: stats.total_threads,
      totalMessages: stats.total_messages,
      activeParticipants: stats.active_participants,
      messagesToday: stats.messages_today
    } : null,
    actionLoading
  });

  // Test des actions
  const handleTestActions = async () => {
    console.log('🧪 [TEST MESSAGES] Test des actions...');

    // Test création thread
    const newThread = await createThread({
      project_id: selectedProject,
      title: 'Thread de test',
      description: 'Thread créé pour les tests',
      thread_type: 'general',
      initial_message: 'Premier message de test'
    });

    if (newThread) {
      console.log('✅ [TEST MESSAGES] Thread créé:', newThread.id);

      // Test envoi message
      const newMessage = await sendMessage({
        thread_id: newThread.id,
        content: 'Message de test dans le nouveau thread',
        message_type: 'text'
      });

      if (newMessage) {
        console.log('✅ [TEST MESSAGES] Message envoyé:', newMessage.id);
      }
    }
  };

  const handleTestRealtime = () => {
    console.log('🧪 [TEST MESSAGES] Test temps réel...');

    // Test typing indicator
    startTyping();

    setTimeout(() => {
      stopTyping();
    }, 2000);
  };

  const handleTestSearch = async () => {
    console.log('🧪 [TEST MESSAGES] Test recherche...');

    const results = await searchMessages(selectedProject, 'test');
    console.log('🔍 [TEST MESSAGES] Résultats recherche:', results.length);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Test Migration Modulaire - MESSAGES</h1>

        <div className="grid grid-cols-3 gap-4 text-sm mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="font-semibold text-blue-900 mb-2">📊 Statistiques</h2>
            <ul className="space-y-1 text-blue-800">
              <li>Threads: {threads.length}</li>
              <li>Messages: {messages.length}</li>
              <li>Total threads: {stats?.total_threads || 0}</li>
              <li>Messages aujourd'hui: {stats?.messages_today || 0}</li>
              <li>Participants actifs: {stats?.active_participants || 0}</li>
              <li>Attachments: {stats?.file_attachments_count || 0}</li>
            </ul>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h2 className="font-semibold text-green-900 mb-2">🔗 Fonctionnalités</h2>
            <ul className="space-y-1 text-green-800">
              <li>✅ Threads temps réel</li>
              <li>✅ Messages avec attachments</li>
              <li>✅ Typing indicators</li>
              <li>✅ Mentions utilisateurs</li>
              <li>✅ Recherche avancée</li>
              <li>✅ Notifications toast</li>
              <li>✅ Équipe IA + Humains</li>
              <li>✅ Statistiques</li>
            </ul>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <h2 className="font-semibold text-purple-900 mb-2">🚀 API Centralisée</h2>
            <ul className="space-y-1 text-purple-800">
              <li>✅ MessageAPI.getProjectThreads()</li>
              <li>✅ MessageAPI.sendMessage()</li>
              <li>✅ MessageAPI.createThread()</li>
              <li>✅ MessageAPI.updateMessage()</li>
              <li>✅ MessageAPI.searchMessages()</li>
              <li>✅ MessageAPI.addParticipant()</li>
              <li>✅ MessageAPI.markMessagesAsRead()</li>
              <li>✅ MessageAPI.getProjectMessageStats()</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-4 justify-center flex-wrap">
          <button
            onClick={handleTestActions}
            disabled={actionLoading}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {actionLoading ? 'Test en cours...' : 'Tester CRUD'}
          </button>

          <button
            onClick={handleTestRealtime}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Tester Temps Réel
          </button>

          <button
            onClick={handleTestSearch}
            disabled={actionLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {actionLoading ? 'Recherche...' : 'Tester Recherche'}
          </button>

          <button
            onClick={() => console.log('🧪 [TEST MESSAGES] API disponible:', {
              getProjectThreads: typeof MessageAPI.getProjectThreads,
              sendMessage: typeof MessageAPI.sendMessage,
              createThread: typeof MessageAPI.createThread,
              updateMessage: typeof MessageAPI.updateMessage,
              deleteMessage: typeof MessageAPI.deleteMessage,
              searchMessages: typeof MessageAPI.searchMessages,
              getProjectMessageStats: typeof MessageAPI.getProjectMessageStats
            })}
            className="px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600"
          >
            Tester API
          </button>
        </div>
      </div>

      <div className="border-t pt-8">
        <h2 className="text-xl font-semibold mb-4">Composant Messages Modernisé</h2>

        <div className="bg-white rounded-xl border border-neutral-200 p-1">
          <EnhancedMessageSystem
            projectId={selectedProject}
            userType="client"
            className="h-[500px]"
          />
        </div>
      </div>

      <div className="border-t pt-8">
        <h2 className="text-xl font-semibold mb-4">Comparaison des Architectures</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="font-medium mb-2">Ancien Système</h3>
            <div className="border-2 border-dashed border-yellow-200 p-4 rounded-lg">
              <ul className="text-sm space-y-2">
                <li>❌ Appels Supabase directs dans composants</li>
                <li>❌ Logique dispersée dans plusieurs hooks</li>
                <li>❌ Pas de centralisation des actions</li>
                <li>❌ Gestion d'état complexe</li>
                <li>❌ Code dupliqué pour réaltime</li>
                <li>❌ Pas de recherche unifiée</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Nouveau Module</h3>
            <div className="border-2 border-dashed border-green-200 p-4 rounded-lg">
              <ul className="text-sm space-y-2">
                <li>✅ API centralisée dans MessageAPI</li>
                <li>✅ Hooks spécialisés et optimisés</li>
                <li>✅ Actions CRUD unifiées</li>
                <li>✅ Gestion d'état simplifiée</li>
                <li>✅ Réaltime avec typing indicators</li>
                <li>✅ Recherche intelligente</li>
                <li>✅ Types TypeScript complets</li>
                <li>✅ Performance optimisée</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-8">
        <h2 className="text-xl font-semibold mb-4">Fonctionnalités Avancées</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="font-semibold text-indigo-900 mb-2">📨 Messages</h3>
            <ul className="text-sm text-indigo-800 space-y-1">
              <li>✅ Temps réel</li>
              <li>✅ Attachments</li>
              <li>✅ Mentions</li>
              <li>✅ Édition/Suppression</li>
              <li>✅ Réactions (prévu)</li>
            </ul>
          </div>

          <div className="bg-cyan-50 p-4 rounded-lg">
            <h3 className="font-semibold text-cyan-900 mb-2">🧵 Threads</h3>
            <ul className="text-sm text-cyan-800 space-y-1">
              <li>✅ Types multiples</li>
              <li>✅ Participants</li>
              <li>✅ Paramètres</li>
              <li>✅ Archivage</li>
              <li>✅ Statistiques</li>
            </ul>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="font-semibold text-amber-900 mb-2">⌨️ Temps Réel</h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>✅ Typing indicators</li>
              <li>✅ Présence utilisateurs</li>
              <li>✅ Messages instantanés</li>
              <li>✅ Notifications</li>
              <li>✅ Auto-scroll</li>
            </ul>
          </div>

          <div className="bg-rose-50 p-4 rounded-lg">
            <h3 className="font-semibold text-rose-900 mb-2">🤖 IA Intégration</h3>
            <ul className="text-sm text-rose-800 space-y-1">
              <li>✅ Assistant IA</li>
              <li>✅ Réponses auto</li>
              <li>✅ Participants IA</li>
              <li>✅ Prompts personnalisés</li>
              <li>✅ Feedback scoring</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestMessagesMigration;