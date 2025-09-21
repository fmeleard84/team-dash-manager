import { supabase } from '@/integrations/supabase/client';

/**
 * Gère les threads privés pour les conversations avec l'IA
 */
export class IAThreadManager {
  /**
   * Récupère ou crée un thread privé entre un utilisateur et une IA
   */
  static async getOrCreatePrivateThread(
    projectId: string,
    userId: string,
    iaProfileId: string,
    iaName: string
  ): Promise<string | null> {
    try {
      console.log('🤖 Getting/Creating private IA thread', {
        projectId,
        userId,
        iaProfileId,
        iaName
      });

      // 1. Chercher un thread existant entre cet utilisateur et cette IA
      const threadTitle = `Conversation privée avec ${iaName}`;

      const { data: existingThread, error: searchError } = await supabase
        .from('message_threads')
        .select('id')
        .eq('project_id', projectId)
        .eq('created_by', userId)
        .eq('title', threadTitle)
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
          description: `Conversation privée avec ${iaName} (IA)`,
          created_by: userId,
          last_message_at: new Date().toISOString(),
          is_active: true,
          // Marquer comme thread IA privé
          metadata: {
            type: 'ia_private',
            ia_profile_id: iaProfileId,
            user_id: userId
          }
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating private thread:', createError);
        return null;
      }

      console.log('✅ Created new private thread:', newThread.id);

      // 3. Ajouter les participants (utilisateur + IA)
      const participants = [
        {
          thread_id: newThread.id,
          user_id: userId,
          email: '', // Will be filled from user profile
          name: '', // Will be filled from user profile
          role: 'user' as const,
          joined_at: new Date().toISOString(),
          is_active: true
        },
        {
          thread_id: newThread.id,
          user_id: iaProfileId, // Use IA profile ID as user_id
          email: `${iaName.toLowerCase().replace(/\s+/g, '_')}@ia.team`,
          name: `${iaName} (IA)`,
          role: 'ia' as const,
          joined_at: new Date().toISOString(),
          is_active: true
        }
      ];

      // Récupérer les infos de l'utilisateur
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', userId)
        .single();

      if (userProfile) {
        participants[0].email = userProfile.email;
        participants[0].name = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email;
      }

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
   * Vérifie si un thread est un thread privé IA
   */
  static async isPrivateIAThread(threadId: string): Promise<boolean> {
    try {
      const { data: thread } = await supabase
        .from('message_threads')
        .select('metadata')
        .eq('id', threadId)
        .single();

      return thread?.metadata?.type === 'ia_private';
    } catch (error) {
      return false;
    }
  }

  /**
   * Récupère tous les threads privés d'un utilisateur avec les IA d'un projet
   */
  static async getUserPrivateIAThreads(projectId: string, userId: string): Promise<any[]> {
    try {
      const { data: threads } = await supabase
        .from('message_threads')
        .select('*')
        .eq('project_id', projectId)
        .eq('created_by', userId)
        .like('title', 'Conversation privée avec %');

      return threads || [];
    } catch (error) {
      console.error('❌ Error fetching private threads:', error);
      return [];
    }
  }
}