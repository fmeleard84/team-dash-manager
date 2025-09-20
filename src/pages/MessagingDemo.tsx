import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UnifiedMessageSystem, messageSystemPresets } from '@/components/messaging/UnifiedMessageSystem';
import { useAuth } from '@/contexts/AuthContext';
import { 
  MessageSquare, 
  Video, 
  Upload, 
  Bell,
  Users,
  Zap,
  Smile,
  AtSign,
  Reply
} from 'lucide-react';

const MessagingDemo = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('new');
  const [demoProjectId] = useState('demo-project-123'); // Project ID for demo

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Authentification requise</CardTitle>
            <CardDescription>
              Veuillez vous connecter pour accéder au système de messagerie.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Système de Messagerie Avancé</h1>
          <p className="text-muted-foreground">
            Démonstration du nouveau système de messagerie avec fonctionnalités Slack-like
          </p>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold">Messages Temps Réel</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Échange instantané avec notifications push
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold">Jitsi Meet</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Appels vidéo intégrés avec partage d'écran
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold">Partage de Fichiers</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload par drag & drop avec prévisualisation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold">Notifications</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Centre de notifications intégré
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Messaging Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Nouvelle Interface
              <Badge variant="secondary">Recommandé</Badge>
            </TabsTrigger>
            <TabsTrigger value="legacy" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Interface Classique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      Interface de Messagerie Slack-like
                    </CardTitle>
                    <CardDescription>
                      Interface moderne avec toutes les fonctionnalités avancées
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Présence temps réel
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Smile className="w-3 h-3" />
                      Réactions
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Reply className="w-3 h-3" />
                      Réponses
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <AtSign className="w-3 h-3" />
                      Mentions
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <UnifiedMessageSystem
                  projectId={demoProjectId}
                  userType="user"
                  config={{
                    ...messageSystemPresets.minimal,
                    callbacks: {
                      onMessageSent: (message) => {
                        console.log('Nouveau message:', message);
                        // Trigger notification update
                      }
                    }
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="legacy" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Interface de Messagerie Classique
                </CardTitle>
                <CardDescription>
                  Interface simple pour comparaison
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UnifiedMessageSystem
                  projectId={demoProjectId}
                  userType="client"
                  config={messageSystemPresets.client}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Instructions et astuces */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>🚀 Comment utiliser le nouveau système</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">📝 Messagerie</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Entrée pour envoyer, Shift+Entrée pour nouvelle ligne</li>
                  <li>• Glissez-déposez des fichiers pour les partager</li>
                  <li>• Cliquez sur 🔗 pour attacher des fichiers</li>
                  <li>• Utilisez @nom pour mentionner quelqu'un</li>
                  <li>• Survolez un message pour voir les actions</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">🎥 Visio-conférence</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Cliquez sur 📹 pour démarrer un appel vidéo</li>
                  <li>• Partagez votre écran avec le bouton de partage</li>
                  <li>• Utilisez le chat intégré pendant l'appel</li>
                  <li>• Invitez d'autres participants au besoin</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">🔔 Notifications</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Notifications bureau automatiques</li>
                  <li>• Sons de notification personnalisables</li>
                  <li>• Centre de notifications dans la barre</li>
                  <li>• Statut de lecture en temps réel</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">⚡ Fonctions Avancées</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Indicateurs de saisie temps réel</li>
                  <li>• Réactions emoji sur les messages</li>
                  <li>• Réponses en thread (fils de discussion)</li>
                  <li>• Modification/suppression de messages</li>
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">💡 Astuce</Badge>
                <span>
                  Toutes les fonctionnalités sont synchronisées en temps réel entre tous les participants du projet.
                  Les notifications sont intégrées au centre de notifications global de l'application.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MessagingDemo;