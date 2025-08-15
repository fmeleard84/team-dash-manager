import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Paperclip } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CandidateMessagesProps {
  candidateId: string;
}

interface ProjectThread {
  id: string;
  project_id: string;
  project_title: string;
  title: string;
  unread_count: number;
  last_message_at: string;
  participants: any[];
}

interface Message {
  id: string;
  thread_id: string;
  sender_name: string;
  sender_email: string;
  content: string;
  created_at: string;
  attachments?: any[];
}

export default function DynamicCandidateMessages({ candidateId }: CandidateMessagesProps) {
  const [threads, setThreads] = useState<ProjectThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Fetch threads for candidate's projects
  const fetchThreads = async () => {
    try {
      // Get candidate's email first
      const { data: candidate } = await supabase
        .from('candidate_profiles')
        .select('email')
        .eq('id', candidateId)
        .single();

      if (!candidate) return;

      // Get threads where candidate is a participant
      const { data: threadsData, error } = await supabase
        .from('message_threads')
        .select(`
          *,
          projects!inner(title),
          message_participants!inner(*)
        `)
        .eq('message_participants.email', candidate.email)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Transform data and calculate unread counts
      const processedThreads = await Promise.all(
        (threadsData || []).map(async (thread: any) => {
          // Count unread messages
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', thread.id)
            .not('sender_email', 'eq', candidate.email)
            .not('id', 'in', `(
              SELECT message_id 
              FROM message_read_status 
              WHERE user_email = '${candidate.email}'
            )`);

          return {
            id: thread.id,
            project_id: thread.project_id,
            project_title: thread.projects.title,
            title: thread.title,
            unread_count: unreadCount || 0,
            last_message_at: thread.last_message_at,
            participants: thread.message_participants
          };
        })
      );

      setThreads(processedThreads);
    } catch (error: any) {
      console.error('Error fetching threads:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les conversations."
      });
    }
  };

  // Fetch messages for selected thread
  const fetchMessages = async (threadId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          message_attachments (*)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      const { data: candidate } = await supabase
        .from('candidate_profiles')
        .select('email')
        .eq('id', candidateId)
        .single();

      if (candidate) {
        const unreadMessages = data?.filter(msg => 
          msg.sender_email !== candidate.email
        ) || [];

        if (unreadMessages.length > 0) {
          const readStatuses = unreadMessages.map(msg => ({
            message_id: msg.id,
            user_email: candidate.email
          }));

          await supabase
            .from('message_read_status')
            .upsert(readStatuses, { 
              onConflict: 'message_id,user_email',
              ignoreDuplicates: true 
            });
        }
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les messages."
      });
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedThread) return;

    setSending(true);
    try {
      // Get candidate info
      const { data: candidate } = await supabase
        .from('candidate_profiles')
        .select('email, first_name, last_name')
        .eq('id', candidateId)
        .single();

      if (!candidate) throw new Error('Candidate not found');

      const senderName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || candidate.email;

      // Insert message
      const { error } = await supabase
        .from('messages')
        .insert({
          thread_id: selectedThread,
          sender_id: candidateId,
          sender_name: senderName,
          sender_email: candidate.email,
          content: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
      await fetchMessages(selectedThread);
      await fetchThreads();

      toast({
        title: "Message envoyé",
        description: "Votre message a été envoyé avec succès."
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'envoyer le message."
      });
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (days === 1) {
      return 'Hier';
    } else if (days < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'long' });
    }
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  // Set up real-time subscriptions
  useEffect(() => {
    const messagesChannel = supabase
      .channel('candidate-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          if (payload.new.thread_id === selectedThread) {
            fetchMessages(selectedThread);
          }
          fetchThreads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedThread]);

  useEffect(() => {
    setLoading(true);
    fetchThreads().finally(() => setLoading(false));
  }, [candidateId]);

  useEffect(() => {
    if (selectedThread) {
      fetchMessages(selectedThread);
    } else {
      setMessages([]);
    }
  }, [selectedThread]);

  if (loading) {
    return <div className="p-6">Chargement des messages...</div>;
  }

  if (threads.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes messages</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aucune conversation disponible. Les conversations sont créées automatiquement 
            lorsque vous êtes assigné à un projet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedThreadData = threads.find(t => t.id === selectedThread);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Mes messages</h2>
      
      <div className="flex gap-4 h-[600px]">
        {/* Threads sidebar */}
        <div className="w-1/3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Conversations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="p-4 space-y-2">
                  {threads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => setSelectedThread(thread.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedThread === thread.id
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {thread.project_title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {thread.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatMessageTime(thread.last_message_at)}
                          </p>
                        </div>
                        {thread.unread_count > 0 && (
                          <Badge variant="default" className="ml-2 text-xs">
                            {thread.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Messages area */}
        <div className="flex-1">
          <Card className="h-full flex flex-col">
            {selectedThreadData ? (
              <>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedThreadData.project_title} - {selectedThreadData.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div key={message.id} className="flex gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">
                              {message.sender_name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {message.sender_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatMessageTime(message.created_at)}
                              </span>
                            </div>
                            <div className="bg-accent/50 rounded-lg p-3">
                              <p className="text-sm whitespace-pre-wrap">
                                {message.content}
                              </p>
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {message.attachments.map((attachment: any) => (
                                    <div key={attachment.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Paperclip className="w-3 h-3" />
                                      <span>{attachment.file_name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Tapez votre message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 min-h-[60px]"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                      />
                      <Button 
                        onClick={sendMessage}
                        disabled={sending || !newMessage.trim()}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <h3 className="text-lg font-semibold mb-2">
                    Sélectionnez une conversation
                  </h3>
                  <p>Choisissez une conversation pour commencer à discuter</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}