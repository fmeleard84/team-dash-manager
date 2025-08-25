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
        profiles:candidate_id (
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
      .select('id')
      .eq('project_id', projectId)
      .eq('title', `Équipe ${project.title}`)
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
          is_active: true
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
      if (booking.profiles) {
        participants.push({
          thread_id: threadId,
          user_id: booking.profiles.id,
          email: booking.profiles.email,
          name: `${booking.profiles.first_name || ''} ${booking.profiles.last_name || ''}`.trim() || booking.profiles.email,
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
  attachments: Array<{ name: string; url: string; path: string; size: number; type: string }> = []
): Promise<void> => {
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
    
    // Get job title/position from candidate_profiles
    let jobTitle = '';
    const { data: candidateProfile } = await supabase
      .from('candidate_profiles')
      .select('position')
      .eq('email', profile.email)
      .single();
    
    if (candidateProfile?.position) {
      jobTitle = candidateProfile.position;
    } else {
      // Check if client (they don't have position)
      jobTitle = ''; // Clients don't have a job title
    }

    // Use only first name for sender_name (job title will be shown separately in UI)
    const senderName = profile.first_name || profile.email.split('@')[0];

    // Créer le message - pour l'instant sans job_title car la colonne n'existe pas encore
    // On inclut le métier dans sender_name temporairement
    const displayName = jobTitle ? `${senderName} (${jobTitle})` : senderName;
    
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        sender_id: user.id,
        sender_name: displayName, // Inclut le métier temporairement
        sender_email: profile.email,
        content: content,
        is_edited: false
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

  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
};