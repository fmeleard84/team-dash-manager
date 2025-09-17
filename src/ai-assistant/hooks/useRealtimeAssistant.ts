// Stub temporaire pour la refactorisation - Phase 1
// Ce fichier sera refactorisé dans la Phase 2

export const useRealtimeAssistant = (config: any) => {
  return {
    isConnected: false,
    isRecording: false,
    isMuted: false,
    audioLevel: 0,
    transcript: '',
    assistantMessage: '',
    error: null,
    connect: async () => {},
    disconnect: async () => {},
    toggleMute: () => {},
    sendMessage: async (message: string) => {},
    volume: 0,
    currentTurnId: null,
    conversationHistory: [],
    clearHistory: () => {},
    setPrompt: (prompt: string) => {}
  };
};