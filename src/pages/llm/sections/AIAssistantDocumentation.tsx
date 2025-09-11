/**
 * Documentation technique de l'Assistant IA
 */

import React from 'react';
import { Card } from '@/ui/components/Card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bot, Brain, Code, Database, Wand2, Settings, 
  FileText, Layers, Network, Zap, Shield, Sparkles 
} from 'lucide-react';

export function AIAssistantDocumentation() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-brand to-brand/80 rounded-xl flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">AI Assistant Intelligent</h1>
          <p className="text-muted-foreground">Documentation technique complète du System d'Voice assistant et textuel</p>
        </div>
      </div>

      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          <strong>Implémentation du 09/09/2025</strong> - System complet avec OpenAI Realtime API, 
          12 tools opérationnels, base de connaissances et interface d'administration.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
          <TabsTrigger value="tools">Tools/Functions</TabsTrigger>
          <TabsTrigger value="knowledge">Base de connaissances</TabsTrigger>
          <TabsTrigger value="integration">Intégration</TabsTrigger>
          <TabsTrigger value="api">API & Hooks</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-brand" />
              Concept et Objectifs
            </h2>
            <div className="space-y-4 text-sm">
              <p>
                L'AI Assistant est un System conversationnel avancé intégré à Team Dash Manager, 
                permettant aux Users d'interagir avec la plateforme via la voix ou le texte.
              </p>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-medium mb-2">🎯 Objectifs Principaux</h3>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Simplifier l'utilisation de la plateforme</li>
                    <li>• Automatiser les actions répétitives</li>
                    <li>• Fournir une aide contextuelle</li>
                    <li>• Améliorer la productivité</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-medium mb-2">🚀 Capacités Clés</h3>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Compréhension du langage naturel</li>
                    <li>• Exécution d'actions complexes</li>
                    <li>• Contexte adaptatif</li>
                    <li>• Apprentissage des Preferences</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-brand" />
              Technologies Utilisées
            </h2>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Badge variant="outline">OpenAI</Badge>
                <span className="text-sm">Realtime API (GPT-4)</span>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Badge variant="outline">WebRTC</Badge>
                <span className="text-sm">Audio streaming</span>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Badge variant="outline">React</Badge>
                <span className="text-sm">Hooks & Components</span>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Badge variant="outline">TypeScript</Badge>
                <span className="text-sm">Type safety</span>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Badge variant="outline">Supabase</Badge>
                <span className="text-sm">Data persistence</span>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Badge variant="outline">WebSockets</Badge>
                <span className="text-sm">Real-time comm</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Architecture */}
        <TabsContent value="architecture" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand" />
              Architecture du System
            </h2>
            
            <div className="bg-muted/30 p-4 rounded-lg font-mono text-sm mb-6">
              <pre>{`src/ai-assistant/
├── config/
│   ├── knowledge-base.ts    # Base de connaissances
│   ├── prompts.ts           # Prompts contextuels
│   └── tools.ts             # Définition des tools
├── tools/
│   ├── platform-knowledge.ts # Explication features
│   ├── team-composer.ts     # Composition équipes
│   ├── meeting-manager.ts   # Gestion réunions
│   ├── task-manager.ts      # Gestion tâches
│   └── navigation-ui.ts     # Navigation UI
├── hooks/
│   └── useRealtimeAssistant.ts # Hook principal
└── components/
    ├── EnhancedVoiceAssistant.tsx # Interface user
    └── AIAssistantConfig.tsx      # Interface admin`}</pre>
            </div>

            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Couche Configuration
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Centralise toutes les définitions et configurations du System.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Badge>knowledge-base.ts</Badge>
                  <Badge>prompts.ts</Badge>
                  <Badge>tools.ts</Badge>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Wand2 className="w-4 h-4" />
                  Couche Logique Métier
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Implémente les fonctions concrètes appelables par l'assistant.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Badge>compose_team</Badge>
                  <Badge>create_meeting</Badge>
                  <Badge>add_task</Badge>
                  <Badge>navigate_to</Badge>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Network className="w-4 h-4" />
                  Couche Intégration
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Gère la Login avec OpenAI et l'orchestration des appels.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Badge>useRealtimeAssistant</Badge>
                  <Badge>WebRTC</Badge>
                  <Badge>Ephemeral Keys</Badge>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Flux de Données</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-xs font-bold">1</div>
                <span>Utilisateur Speaking ou écrit → Capture audio/texte</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-xs font-bold">2</div>
                <span>Envoi à OpenAI Realtime API via WebSocket</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-xs font-bold">3</div>
                <span>IA analyse avec contexte + prompts + knowledge base</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-xs font-bold">4</div>
                <span>Détection d'intention → Appel de tool si nécessaire</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-xs font-bold">5</div>
                <span>Exécution du tool → Interaction avec Supabase/UI</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-xs font-bold">6</div>
                <span>Back résultat → Génération réponse vocale/texte</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tools/Functions */}
        <TabsContent value="tools" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-brand" />
              Tools Availables (12)
            </h2>
            
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {/* Knowledge Tools */}
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-3 text-sm">📚 Connaissance</h3>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <code className="bg-muted px-2 py-1 rounded">explain_platform_feature</code>
                      <p className="text-xs text-muted-foreground mt-1">
                        Explique une fonctionnalité en détail
                      </p>
                    </div>
                    <div className="text-sm">
                      <code className="bg-muted px-2 py-1 rounded">search_knowledge</code>
                      <p className="text-xs text-muted-foreground mt-1">
                        Recherche in la base de connaissances
                      </p>
                    </div>
                  </div>
                </div>

                {/* Team Tools */}
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-3 text-sm">👥 Team</h3>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <code className="bg-muted px-2 py-1 rounded">compose_team</code>
                      <p className="text-xs text-muted-foreground mt-1">
                        Compose une Team optimale pour un Project
                      </p>
                    </div>
                    <div className="text-sm">
                      <code className="bg-muted px-2 py-1 rounded">suggest_team_member</code>
                      <p className="text-xs text-muted-foreground mt-1">
                        Suggère un Profile spécifique
                      </p>
                    </div>
                  </div>
                </div>

                {/* Meeting Tools */}
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-3 text-sm">📅 Réunions</h3>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <code className="bg-muted px-2 py-1 rounded">create_meeting</code>
                      <p className="text-xs text-muted-foreground mt-1">
                        Crée une réunion avec participants
                      </p>
                    </div>
                    <div className="text-sm">
                      <code className="bg-muted px-2 py-1 rounded">find_available_slot</code>
                      <p className="text-xs text-muted-foreground mt-1">
                        Trouve un créneau Available
                      </p>
                    </div>
                  </div>
                </div>

                {/* Task Tools */}
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-3 text-sm">✅ Tâches</h3>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <code className="bg-muted px-2 py-1 rounded">add_task</code>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ajoute une tâche au Kanban
                      </p>
                    </div>
                    <div className="text-sm">
                      <code className="bg-muted px-2 py-1 rounded">update_task_status</code>
                      <p className="text-xs text-muted-foreground mt-1">
                        Change le Status d'une tâche
                      </p>
                    </div>
                  </div>
                </div>

                {/* Project Tools */}
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-3 text-sm">📊 Projects</h3>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <code className="bg-muted px-2 py-1 rounded">get_project_status</code>
                      <p className="text-xs text-muted-foreground mt-1">
                        Obtient le Status détaillé d'un Project
                      </p>
                    </div>
                    <div className="text-sm">
                      <code className="bg-muted px-2 py-1 rounded">list_projects</code>
                      <p className="text-xs text-muted-foreground mt-1">
                        Liste les Projects avec filtres
                      </p>
                    </div>
                  </div>
                </div>

                {/* UI Tools */}
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-3 text-sm">🎨 Interface</h3>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <code className="bg-muted px-2 py-1 rounded">navigate_to</code>
                      <p className="text-xs text-muted-foreground mt-1">
                        Navigue vers une section
                      </p>
                    </div>
                    <div className="text-sm">
                      <code className="bg-muted px-2 py-1 rounded">show_notification</code>
                      <p className="text-xs text-muted-foreground mt-1">
                        Affiche une notification
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Exemple d'Implémentation de Tool</h2>
            <div className="bg-muted/30 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm font-mono">{`export async function compose_team(args: {
  project_type: string;
  project_complexity?: string;
  team_size?: number;
  budget_range?: { min?: number; max?: number };
  duration_months?: number;
  required_skills?: string[];
}): Promise<ComposeTeamResult> {
  // 1. Sélection du template approprié
  const template = TEAM_TEMPLATES[\`\${args.project_type}_\${args.project_complexity}\`];
  
  // 2. Ajustement selon les contraintes
  let team = adjustTeamSize(template, args.team_size);
  team = filterByBudget(team, args.budget_range);
  
  // 3. Calcul des coûts
  const totalCost = calculateTeamCost(team, args.duration_months);
  
  // 4. Retour du résultat structuré
  return {
    success: true,
    composition: team,
    totalCost,
    message: \`Équipe de \${team.length} personnes composée\`
  };
}`}</pre>
            </div>
          </Card>
        </TabsContent>

        {/* Base de connaissances */}
        <TabsContent value="knowledge" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand" />
              Structure de la Base de Connaissances
            </h2>
            
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                La base de connaissances contient toutes les Informations sur la plateforme, 
                structurées pour être facilement accessibles par l'IA.
              </p>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Fonctionnalités Documentées</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">reactflow</Badge>
                      <span className="text-xs">Composition d'Team</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Kanban</Badge>
                      <span className="text-xs">Gestion des tâches</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Planning</Badge>
                      <span className="text-xs">Calendrier Project</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Messages</Badge>
                      <span className="text-xs">Communication</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Structure d'une Entrée</h3>
                  <div className="bg-muted/30 p-3 rounded text-xs font-mono">
                    <pre>{`{
  title: string;
  description: string;
  details: string;
  workflows?: string[];
  tips?: string[];
  relatedFeatures?: string[];
}`}</pre>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">System de Prompts Contextuels</h2>
            
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-3 border rounded-lg">
                  <Badge className="mb-2">general</Badge>
                  <p className="text-xs text-muted-foreground">
                    Assistant général, comportement par défaut
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <Badge className="mb-2">team-composition</Badge>
                  <p className="text-xs text-muted-foreground">
                    Spécialisé in la composition d'Teams
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <Badge className="mb-2">project-management</Badge>
                  <p className="text-xs text-muted-foreground">
                    Focus sur la gestion de Projects
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <Badge className="mb-2">meeting</Badge>
                  <p className="text-xs text-muted-foreground">
                    Organisation de réunions
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <Badge className="mb-2">task-management</Badge>
                  <p className="text-xs text-muted-foreground">
                    Gestion des tâches Kanban
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <Badge className="mb-2">technical</Badge>
                  <p className="text-xs text-muted-foreground">
                    Support technique
                  </p>
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  Les prompts sont combinés selon le contexte : le prompt général + le prompt spécifique 
                  au contexte sont envoyés ensemble à l'IA pour une meilleure pertinence.
                </AlertDescription>
              </Alert>
            </div>
          </Card>
        </TabsContent>

        {/* Intégration */}
        <TabsContent value="integration" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Network className="w-5 h-5 text-brand" />
              Intégration OpenAI Realtime API
            </h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium mb-2">Processus de Login</h3>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li>1. Génération d'une clé éphémère via <code>/v1/realtime/Client_secrets</code></li>
                  <li>2. Établissement Login WebSocket avec la clé</li>
                  <li>3. Configuration de la session (modèle, tools, prompts)</li>
                  <li>4. Activation du streaming audio bidirectionnel</li>
                </ol>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium mb-2">Gestion Audio WebRTC</h3>
                <div className="grid gap-2 md:grid-cols-2 text-sm">
                  <div>
                    <strong>Capture Audio:</strong>
                    <ul className="text-muted-foreground mt-1">
                      <li>• MediaRecorder API</li>
                      <li>• Chunks de 100ms</li>
                      <li>• Encodage Base64</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Lecture Audio:</strong>
                    <ul className="text-muted-foreground mt-1">
                      <li>• AudioContext API</li>
                      <li>• Buffer streaming</li>
                      <li>• Gestion latence</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Security et Performance</h2>
            
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Security
                </h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✓ Clés éphémères (durée limitée)</li>
                  <li>✓ Validation des Settings</li>
                  <li>✓ Sanitization des entrées</li>
                  <li>✓ Rate limiting côté API</li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Performance
                </h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✓ Streaming temps réel</li>
                  <li>✓ Cache des résultats</li>
                  <li>✓ Lazy loading des tools</li>
                  <li>✓ Debouncing des appels</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* API & Hooks */}
        <TabsContent value="api" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-brand" />
              Hook Principal: useRealtimeAssistant
            </h2>
            
            <div className="bg-muted/30 p-4 rounded-lg mb-4">
              <pre className="text-sm font-mono">{`const {
  state,           // État de la connexion et messages
  connect,         // Établir la connexion
  disconnect,      // Fermer la connexion
  startListening,  // Activer le micro
  stopListening,   // Désactiver le micro
  sendMessage,     // Envoyer un message texte
  executeFunction, // Exécuter un tool directement
  clearTranscript, // Effacer l'historique
  isSupported      // Vérifier le support navigateur
} = useRealtimeAssistant({
  context: 'general',    // Contexte du prompt
  enableTools: true,     // Activer les tools
  autoConnect: false     // Connexion automatique
});`}</pre>
            </div>

            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm mb-1">State Management</h4>
                <p className="text-xs text-muted-foreground">
                  Gestion complète de l'état : Login, écoute, Processing, Errors, transcript
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm mb-1">Event Handling</h4>
                <p className="text-xs text-muted-foreground">
                  Listeners pour audio.delta, conversation.item.completed, function_call_arguments
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm mb-1">Error Recovery</h4>
                <p className="text-xs text-muted-foreground">
                  ReLogin automatique, fallback gracieux, gestion des timeouts
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Utilisation in un Composant</h2>
            
            <div className="bg-muted/30 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm font-mono">{`function MyComponent() {
  const assistant = useRealtimeAssistant({
    context: 'project-management'
  });

  const handleVoiceCommand = async () => {
    if (!assistant.state.isConnected) {
      await assistant.connect();
    }
    assistant.startListening();
  };

  const handleTextCommand = (text: string) => {
    assistant.sendMessage(text);
  };

  return (
    <div>
      {assistant.state.isListening && <Badge>Écoute...</Badge>}
      {assistant.state.response && <p>{assistant.state.response}</p>}
      <Button onClick={handleVoiceCommand}>
        Commande Vocale
      </Button>
    </div>
  );
}`}</pre>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Extension du System</h2>
            
            <div className="space-y-4 text-sm">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Add un Nouveau Tool</h3>
                <ol className="space-y-1 text-muted-foreground">
                  <li>1. Définir in <code>config/tools.ts</code></li>
                  <li>2. Implémenter in <code>tools/[category].ts</code></li>
                  <li>3. Export in <code>tools/index.ts</code></li>
                  <li>4. Tester avec l'assistant</li>
                </ol>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Personnaliser les Prompts</h3>
                <ol className="space-y-1 text-muted-foreground">
                  <li>1. Accéder à l'interface admin</li>
                  <li>2. Créer/Edit un prompt</li>
                  <li>3. Définir le contexte et la priorité</li>
                  <li>4. Sauvegarder et tester</li>
                </ol>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}