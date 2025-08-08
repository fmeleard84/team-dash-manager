import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';

interface CandidateMessagesProps {
  candidateId: string;
}

interface MessageRow {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

export default function CandidateMessages({ candidateId }: CandidateMessagesProps) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('candidate_notifications')
        .select('id, title, description, status, created_at')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });
      if (!error) setMessages(data || []);
      setLoading(false);
    };
    fetchMessages();
  }, [candidateId]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase.from('candidate_notifications').update({ status: 'read' }).eq('id', id);
    if (!error) setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'read' } : m)));
  };

  if (loading) return <div className="p-6">Chargement...</div>;

  if (messages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes messages</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aucun message pour le moment.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Mes messages</h2>
      <div className="grid gap-4">
        {messages.map((msg) => (
          <Card key={msg.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{msg.title}</CardTitle>
                <Badge variant={msg.status === 'unread' ? 'default' : 'secondary'}>
                  {msg.status === 'unread' ? 'Non lu' : 'Lu'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground whitespace-pre-line">{msg.description}</p>
              {msg.status === 'unread' && (
                <Button variant="outline" size="sm" onClick={() => markAsRead(msg.id)}>
                  <Eye className="w-4 h-4 mr-2" /> Marquer comme lu
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
