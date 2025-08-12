import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Send, 
  Search, 
  Plus, 
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Info
} from "lucide-react";
import { MessageThread, Message } from "@/types/notifications";

// Mock data pour la démo
const mockThreads: MessageThread[] = [
  {
    id: "thread-1",
    projectId: "proj-123",
    participants: ["user-1", "user-2"],
    title: "Projet Refonte E-commerce - Discussion",
    lastMessageAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    unreadCount: 2,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "thread-2",
    projectId: "proj-456",
    participants: ["user-1", "user-3"],
    title: "Marie Dupont",
    lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "thread-3",
    participants: ["user-1", "user-4", "user-5"],
    title: "Équipe Dev - Canal général",
    lastMessageAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    unreadCount: 1,
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
];

const mockMessages: Message[] = [
  {
    id: "msg-1",
    threadId: "thread-1",
    senderId: "user-2",
    senderName: "Marie Dupont",
    content: "Bonjour ! J'ai quelques questions sur les spécifications du projet.",
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    readBy: [{ userId: "user-1", readAt: new Date(Date.now() - 25 * 60 * 1000).toISOString() }],
  },
  {
    id: "msg-2",
    threadId: "thread-1",
    senderId: "user-1",
    senderName: "Vous",
    content: "Bien sûr ! Je suis disponible pour en discuter. Quels sont les points qui vous posent question ?",
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    readBy: [{ userId: "user-2", readAt: new Date(Date.now() - 20 * 60 * 1000).toISOString() }],
  },
  {
    id: "msg-3",
    threadId: "thread-1",
    senderId: "user-2",
    senderName: "Marie Dupont",
    content: "Notamment sur l'intégration du système de paiement. Avez-vous déjà travaillé avec Stripe ?",
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    readBy: [],
  },
  {
    id: "msg-4",
    threadId: "thread-1",
    senderId: "user-2",
    senderName: "Marie Dupont",
    content: "Et aussi, quel délai estimez-vous pour cette partie du projet ?",
    attachments: [
      {
        id: "att-1",
        name: "specifications.pdf",
        url: "/mock/file.pdf",
        type: "application/pdf",
        size: 245760,
      },
    ],
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    readBy: [],
  },
];

const formatMessageTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  
  return date.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit',
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const MessageSystem = () => {
  const [selectedThread, setSelectedThread] = useState<string>(mockThreads[0].id);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const currentThread = mockThreads.find(t => t.id === selectedThread);
  const threadMessages = mockMessages.filter(m => m.threadId === selectedThread);
  
  const filteredThreads = mockThreads.filter(thread =>
    thread.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    // Ici on ajouterait la logique d'envoi
    console.log("Envoi du message:", newMessage);
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-[600px] flex border rounded-lg bg-background">
      {/* Sidebar avec liste des conversations */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-semibold text-lg">Messages</h2>
            <Button variant="ghost" size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Rechercher des conversations..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {filteredThreads.map((thread) => (
              <div
                key={thread.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedThread === thread.id ? 'bg-accent' : 'hover:bg-accent/50'
                }`}
                onClick={() => setSelectedThread(thread.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={`/avatars/${thread.id}.png`} />
                    <AvatarFallback>
                      {thread.title.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate text-sm">{thread.title}</h3>
                      {thread.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                          {thread.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatMessageTime(thread.lastMessageAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Zone de conversation */}
      <div className="flex-1 flex flex-col">
        {currentThread ? (
          <>
            {/* Header de la conversation */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    {currentThread.title.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{currentThread.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {currentThread.participants.length} participant{currentThread.participants.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Info className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {threadMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.senderName === 'Vous' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${message.senderName === 'Vous' ? 'order-2' : 'order-1'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {message.senderName !== 'Vous' && (
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">
                              {message.senderName.split(' ').map(w => w[0]).join('').substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {message.senderName === 'Vous' ? '' : message.senderName} · {formatMessageTime(message.createdAt)}
                        </span>
                      </div>
                      
                      <div className={`p-3 rounded-lg ${
                        message.senderName === 'Vous' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.attachments.map((attachment) => (
                              <div 
                                key={attachment.id}
                                className="flex items-center gap-2 p-2 bg-background/10 rounded border"
                              >
                                <Paperclip className="w-4 h-4" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{attachment.name}</p>
                                  <p className="text-xs opacity-70">
                                    {(attachment.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
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

            {/* Zone de saisie */}
            <div className="p-4 border-t">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Textarea
                    placeholder="Tapez votre message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="min-h-[80px] resize-none"
                    maxLength={1000}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Paperclip className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {newMessage.length}/1000
                      </span>
                      <Button 
                        onClick={sendMessage} 
                        disabled={!newMessage.trim()}
                        size="icon"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>Sélectionnez une conversation pour commencer</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};