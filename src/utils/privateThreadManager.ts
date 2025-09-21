import { supabase } from '@/integrations/supabase/client';

interface Participant {
  id: string;
  name: string;
  email: string;
  isAI?: boolean;
  profileId?: string;
}

/**
 * Gère les threads privés pour toutes les conversations (1-to-1, groupes privés, IA)
 */
export class PrivateThreadManager {
  /**
   * Méthode unifiée pour créer ou récupérer n'importe quel type de thread
   */
  static async getOrCreateThread(
    projectId: string,
    currentUser: Participant,
    selectedParticipants: Participant[],
    totalTeamSize: number,
    groupName?: string
  ): Promise<{ threadId: string | null; type: 'team' | 'private' | 'group' }> {
    const conversationType = this.getConversationType(selectedParticipants.map(p => p.id), totalTeamSize);

    switch (conversationType) {
      case 'team':
        // Thread principal d'équipe - retourner null pour utiliser le thread par défaut
        return { threadId: null, type: 'team' };

      case 'private':
        // Conversation 1-to-1
        const threadId = await this.getOrCreatePrivateThread(
          projectId,
          currentUser,
          selectedParticipants[0]
        );
        return { threadId, type: 'private' };

      case 'group':
        // Groupe privé
        const groupThreadId = await this.getOrCreateGroupThread(
          projectId,
          currentUser,
          selectedParticipants,
          groupName
        );
        return { threadId: groupThreadId, type: 'group' };
    }
  }
  /**
   * Détermine le type de conversation
   */
  static getConversationType(selectedMembers: string[], totalTeamMembers: number): 'private' | 'group' | 'team' {
    if (selectedMembers.length === 0 || selectedMembers.length === totalTeamMembers) {
      return 'team'; // Thread principal d'équipe
    }
    if (selectedMembers.length === 1) {
      return 'private'; // Conversation 1-to-1
    }
    return 'group'; // Groupe privé (2+ personnes mais pas toute l'équipe)
  }

  /**
   * Génère un identifiant unique pour un groupe d'utilisateurs (ordre indépendant)
   */
  private static generateThreadKey(...userIds: string[]): string {
    // Trier les IDs pour garantir la cohérence peu importe l'ordre
    return userIds.sort().join('_');
  }

  /**
   * Récupère ou crée un thread de groupe privé
   */
  static async getOrCreateGroupThread(
    projectId: string,
    currentUser: Participant,
    participants: Participant[],
    groupName?: string
  ): Promise<string | null> {
    try {
      console.log('👥 Getting/Creating group thread', {
        projectId,
        currentUser,
        participants
      });

      // Inclure l'utilisateur courant dans la génération de la clé
      const allParticipantIds = [currentUser.id, ...participants.map(p => p.id)];
      const threadKey = this.generateThreadKey(...allParticipantIds);

      // Générer un nom de groupe automatique si non fourni
      const threadTitle = groupName ||
        `Groupe: ${participants.slice(0, 3).map(p => p.name.split(' ')[0]).join(', ')}${participants.length > 3 ? ` +${participants.length - 3}` : ''}`;

      // 1. Chercher un thread existant avec cette clé
      const { data: existingThread } = await supabase
        .from('message_threads')
        .select('id')
        .eq('project_id', projectId)
        .contains('metadata', { thread_key: threadKey })
        .single();

      if (existingThread) {
        console.log('✅ Found existing group thread:', existingThread.id);
        return existingThread.id;
      }

      // 2. Créer un nouveau thread de groupe
      const { data: newThread, error: createError } = await supabase
        .from('message_threads')
        .insert({
          project_id: projectId,
          title: threadTitle,
          description: `Groupe privé avec ${participants.length + 1} membres`,
          created_by: currentUser.id,
          last_message_at: new Date().toISOString(),
          is_active: true,
          metadata: {
            type: 'group',
            thread_key: threadKey,
            participants: [
              { id: currentUser.id, name: currentUser.name, isAI: false },
              ...participants.map(p => ({ id: p.id, name: p.name, isAI: p.isAI || false }))
            ]
          }
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating group thread:', createError);
        return null;
      }

      console.log('✅ Created new group thread:', newThread.id);

      // 3. Ajouter tous les participants
      const participantRecords = [
        {
          thread_id: newThread.id,
          user_id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
          role: 'user' as const,
          joined_at: new Date().toISOString(),
          is_active: true
        },
        ...participants.map(p => ({
          thread_id: newThread.id,
          user_id: p.id,
          email: p.email,
          name: p.name,
          role: (p.isAI ? 'ia' : 'user') as const,
          joined_at: new Date().toISOString(),
          is_active: true
        }))
      ];

      const { error: participantsError } = await supabase
        .from('message_participants')
        .upsert(participantRecords, {
          onConflict: 'thread_id,email',
          ignoreDuplicates: false
        });

      if (participantsError) {
        console.error('❌ Error adding participants:', participantsError);
      }

      return newThread.id;
    } catch (error) {
      console.error('❌ Error in getOrCreateGroupThread:', error);
      return null;
    }
  }

  /**
   * Récupère ou crée un thread privé entre deux participants (1-to-1)
   */
  static async getOrCreatePrivateThread(
    projectId: string,
    currentUser: Participant,
    otherParticipant: Participant
  ): Promise<string | null> {
    try {
      console.log('🔐 Getting/Creating private thread', {
        projectId,
        currentUser,
        otherParticipant
      });

      // Générer la clé unique pour cette paire
      const threadKey = this.generateThreadKey(currentUser.id, otherParticipant.id);

      // Déterminer le titre du thread
      const threadTitle = otherParticipant.isAI
        ? `Conversation privée avec ${otherParticipant.name}`
        : `Conversation avec ${otherParticipant.name}`;

      // 1. Chercher un thread existant avec cette clé
      const { data: existingThread, error: searchError } = await supabase
        .from('message_threads')
        .select('id')
        .eq('project_id', projectId)
        .contains('metadata', { thread_key: threadKey })
        .single();

      if (existingThread) {
        console.log('✅ Found existing private thread:', existingThread.id);
        return existingThread.id;
      }

      // 2. Si pas de thread, en créer un nouveau
      const { data: newThread, error: createError } = await supabase
        .from('message_threads')
        .insert({
          project_id: projectId,
          title: threadTitle,
          description: otherParticipant.isAI
            ? `Conversation privée avec ${otherParticipant.name} (IA)`
            : `Conversation privée entre ${currentUser.name} et ${otherParticipant.name}`,
          created_by: currentUser.id,
          last_message_at: new Date().toISOString(),
          is_active: true,
          // Métadonnées pour identifier le type de thread
          metadata: {
            type: 'private',
            thread_key: threadKey,
            is_ai_conversation: otherParticipant.isAI || false,
            participants: [
              { id: currentUser.id, name: currentUser.name, isAI: false },
              { id: otherParticipant.id, name: otherParticipant.name, isAI: otherParticipant.isAI || false }
            ]
          }
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating private thread:', createError);
        return null;
      }

      console.log('✅ Created new private thread:', newThread.id);

      // 3. Ajouter les participants
      const participants = [
        {
          thread_id: newThread.id,
          user_id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
          role: 'user' as const,
          joined_at: new Date().toISOString(),
          is_active: true
        },
        {
          thread_id: newThread.id,
          user_id: otherParticipant.id,
          email: otherParticipant.email,
          name: otherParticipant.name,
          role: otherParticipant.isAI ? 'ia' : 'user' as const,
          joined_at: new Date().toISOString(),
          is_active: true
        }
      ];

      const { error: participantsError } = await supabase
        .from('message_participants')
        .upsert(participants, {
          onConflict: 'thread_id,email',
          ignoreDuplicates: false
        });

      if (participantsError) {
        console.error('❌ Error adding participants:', participantsError);
      }

      return newThread.id;
    } catch (error) {
      console.error('❌ Error in getOrCreatePrivateThread:', error);
      return null;
    }
  }

  /**
   * Vérifie si un thread est privé (1-to-1)
   */
  static async isPrivateThread(threadId: string): Promise<boolean> {
    try {
      const { data: thread } = await supabase
        .from('message_threads')
        .select('metadata')
        .eq('id', threadId)
        .single();

      return thread?.metadata?.type === 'private';
    } catch (error) {
      return false;
    }
  }

  /**
   * Récupère le thread privé entre deux participants spécifiques
   */
  static async findPrivateThread(
    projectId: string,
    userId1: string,
    userId2: string
  ): Promise<string | null> {
    try {
      const threadKey = this.generateThreadKey(userId1, userId2);

      const { data: thread } = await supabase
        .from('message_threads')
        .select('id')
        .eq('project_id', projectId)
        .contains('metadata', { thread_key: threadKey })
        .single();

      return thread?.id || null;
    } catch (error) {
      console.error('❌ Error finding private thread:', error);
      return null;
    }
  }

  /**
   * Récupère tous les threads privés d'un utilisateur dans un projet
   */
  static async getUserPrivateThreads(projectId: string, userId: string): Promise<any[]> {
    try {
      const { data: threads } = await supabase
        .from('message_threads')
        .select('*')
        .eq('project_id', projectId)
        .eq('metadata->type', 'private')
        .or(`metadata->participants.0.id.eq.${userId},metadata->participants.1.id.eq.${userId}`);

      return threads || [];
    } catch (error) {
      console.error('❌ Error fetching private threads:', error);
      return [];
    }
  }

  /**
   * Migration: Convertir les anciens threads IA privés au nouveau format
   */
  static async migrateIAThreads(): Promise<void> {
    try {
      const { data: iaThreads } = await supabase
        .from('message_threads')
        .select('*')
        .eq('metadata->type', 'ia_private');

      if (!iaThreads || iaThreads.length === 0) {
        console.log('No IA threads to migrate');
        return;
      }

      for (const thread of iaThreads) {
        const userId = thread.metadata?.user_id;
        const iaProfileId = thread.metadata?.ia_profile_id;

        if (userId && iaProfileId) {
          const threadKey = this.generateThreadKey(userId, iaProfileId);

          await supabase
            .from('message_threads')
            .update({
              metadata: {
                ...thread.metadata,
                type: 'private',
                thread_key: threadKey,
                is_ai_conversation: true
              }
            })
            .eq('id', thread.id);
        }
      }

      console.log(`✅ Migrated ${iaThreads.length} IA threads to new format`);
    } catch (error) {
      console.error('❌ Error migrating IA threads:', error);
    }
  }
}