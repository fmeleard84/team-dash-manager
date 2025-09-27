import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FullScreenModal, ModalActions, useFullScreenModal } from '@/components/ui/fullscreen-modal';
import { Code, Eye, Settings, Save, Edit, Trash2, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DesignSystemModal() {
  const exampleModal = useFullScreenModal();
  const [exampleContent, setExampleContent] = useState('');

  return (
    <div className="space-y-8">
      {/* Introduction */}
      <div>
        <h1 className="text-3xl font-bold mb-4">Système de Modals Plein Écran</h1>
        <p className="text-gray-600 text-lg">
          Notre système de modals utilise une approche plein écran pour offrir une expérience immersive 
          et cohérente à travers toute l'application.
        </p>
      </div>

      {/* Principe de Design */}
      <Card>
        <CardHeader>
          <CardTitle>Principes de Design</CardTitle>
          <CardDescription>Les règles fondamentales de nos modals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold mb-1">1. Plein Écran</h3>
              <p className="text-sm text-gray-600">
                Tous les modals occupent l'intégralité de l'écran, masquant complètement l'interface principale 
                pour une concentration maximale sur la tâche en cours.
              </p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold mb-1">2. Header Minimaliste</h3>
              <p className="text-sm text-gray-600">
                Le header contient uniquement les actions : bouton retour à gauche, actions (Enregistrer, Modifier, etc.) à droite.
                Le titre et la description sont dans le contenu principal pour une meilleure hiérarchie visuelle.
              </p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold mb-1">3. Actions Contextuelles</h3>
              <p className="text-sm text-gray-600">
                Les actions (Enregistrer, Modifier, Supprimer) sont positionnées à droite du header 
                pour un accès rapide et une cohérence visuelle.
              </p>
            </div>
            
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-semibold mb-1">4. Contenu Scrollable</h3>
              <p className="text-sm text-gray-600">
                Le contenu principal est scrollable indépendamment du header, permettant de naviguer 
                dans de longs formulaires tout en gardant les actions accessibles.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anatomie du Modal */}
      <Card>
        <CardHeader>
          <CardTitle>Anatomie d'un Modal</CardTitle>
          <CardDescription>Structure et composants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 rounded-lg p-4 space-y-2">
            <div className="bg-white border-2 border-purple-500 rounded p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-purple-600">HEADER</span>
                <span className="text-xs text-gray-500">Minimaliste, actions uniquement</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 p-2 rounded">
                  <span className="font-medium">← Retour</span> (Gauche)
                </div>
                <div className="bg-gray-50 p-2 rounded text-right">
                  Actions → (Droite)
                </div>
              </div>
            </div>
            
            <div className="bg-white border-2 border-blue-500 rounded p-3 min-h-[150px]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-blue-600">CONTENU</span>
                <span className="text-xs text-gray-500">Scrollable</span>
              </div>
              <div className="space-y-2">
                <div className="bg-blue-50 p-2 rounded">
                  <div className="font-bold text-lg">Titre du Modal</div>
                  <div className="text-sm text-gray-600">Description optionnelle</div>
                </div>
                <div className="text-sm text-gray-600 p-2">
                  Zone de contenu principal du modal...
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Usage du Composant</CardTitle>
          <CardDescription>Comment utiliser FullScreenModal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm">
{`import { FullScreenModal, ModalActions, useFullScreenModal } from '@/components/ui/fullscreen-modal';

function MyComponent() {
  const modal = useFullScreenModal();
  
  return (
    <>
      <Button onClick={modal.open}>Ouvrir Modal</Button>
      
      <FullScreenModal
        isOpen={modal.isOpen}
        onClose={modal.close}
        title="Titre du Modal"
        description="Description optionnelle"
        actions={
          <ModalActions
            onSave={() => console.log('Saved')}
            onDelete={() => console.log('Deleted')}
            saveDisabled={false}
          />
        }
      >
        {/* Contenu du modal */}
        <div>Mon contenu...</div>
      </FullScreenModal>
    </>
  );
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Props Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Props du FullScreenModal</CardTitle>
          <CardDescription>Toutes les propriétés disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Prop</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Défaut</th>
                  <th className="text-left p-2">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-mono text-xs">isOpen</td>
                  <td className="p-2 text-gray-600">boolean</td>
                  <td className="p-2">-</td>
                  <td className="p-2">Contrôle l'affichage du modal</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-mono text-xs">onClose</td>
                  <td className="p-2 text-gray-600">{'() => void'}</td>
                  <td className="p-2">-</td>
                  <td className="p-2">Fonction appelée à la fermeture</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-mono text-xs">title</td>
                  <td className="p-2 text-gray-600">string</td>
                  <td className="p-2">-</td>
                  <td className="p-2">Titre du modal</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-mono text-xs">description</td>
                  <td className="p-2 text-gray-600">string</td>
                  <td className="p-2">undefined</td>
                  <td className="p-2">Description sous le titre</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-mono text-xs">actions</td>
                  <td className="p-2 text-gray-600">ReactNode</td>
                  <td className="p-2">undefined</td>
                  <td className="p-2">Actions dans le header</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-mono text-xs">showBackButton</td>
                  <td className="p-2 text-gray-600">boolean</td>
                  <td className="p-2">true</td>
                  <td className="p-2">Afficher le bouton retour</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-mono text-xs">backButtonText</td>
                  <td className="p-2 text-gray-600">string</td>
                  <td className="p-2">"Retour"</td>
                  <td className="p-2">Texte du bouton retour</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-mono text-xs">preventClose</td>
                  <td className="p-2 text-gray-600">boolean</td>
                  <td className="p-2">false</td>
                  <td className="p-2">Empêcher la fermeture</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ModalActions Helper */}
      <Card>
        <CardHeader>
          <CardTitle>Composant ModalActions</CardTitle>
          <CardDescription>Helper pour les actions standards</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Le composant <code className="bg-gray-100 px-1 py-0.5 rounded">ModalActions</code> fournit 
              un ensemble d'actions prédéfinies avec un style cohérent.
            </AlertDescription>
          </Alert>
          
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm">
{`<ModalActions
  onSave={handleSave}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onCancel={handleCancel}
  saveText="Valider"
  saveDisabled={!isValid}
  isLoading={isSaving}
  customActions={
    <Button variant="outline" size="sm">
      <Plus className="w-4 h-4 mr-2" />
      Ajouter
    </Button>
  }
/>`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Live Example */}
      <Card>
        <CardHeader>
          <CardTitle>Exemple Interactif</CardTitle>
          <CardDescription>Testez le modal en direct</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={exampleModal.open}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Eye className="w-4 h-4 mr-2" />
            Ouvrir un Modal d'Exemple
          </Button>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>Bonnes Pratiques</CardTitle>
          <CardDescription>Recommandations d'utilisation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-2">
              <span className="text-green-600">✓</span>
              <div>
                <strong>Utilisez le hook useFullScreenModal</strong> pour gérer l'état d'ouverture/fermeture
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-green-600">✓</span>
              <div>
                <strong>Placez les actions principales à droite</strong> dans l'ordre : Annuler, Supprimer, Modifier, Enregistrer
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-green-600">✓</span>
              <div>
                <strong>Utilisez ModalActions</strong> pour maintenir la cohérence des boutons d'action
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-red-600">✗</span>
              <div>
                <strong>Évitez les modals imbriqués</strong> - utilisez plutôt des étapes ou des tabs
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-red-600">✗</span>
              <div>
                <strong>Ne masquez pas le bouton retour</strong> sauf cas exceptionnels (processus obligatoire)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example Modal */}
      <FullScreenModal
        isOpen={exampleModal.isOpen}
        onClose={exampleModal.close}
        title="Exemple de Modal Plein Écran"
        description="Ceci est un exemple fonctionnel de notre système de modal"
        actions={
          <ModalActions
            onSave={() => {
              alert('Enregistré !');
              exampleModal.close();
            }}
            onEdit={() => alert('Mode édition')}
            onDelete={() => {
              if (confirm('Êtes-vous sûr ?')) {
                alert('Supprimé !');
                exampleModal.close();
              }
            }}
            saveDisabled={!exampleContent}
            customActions={
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Options
              </Button>
            }
          />
        }
      >
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contenu du Modal</CardTitle>
              <CardDescription>
                Exemple de contenu dans un modal plein écran
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Champ de texte
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Entrez du texte..."
                  value={exampleContent}
                  onChange={(e) => setExampleContent(e.target.value)}
                />
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Zone d'information</h4>
                <p className="text-sm text-gray-600">
                  Le contenu du modal est scrollable et peut contenir des formulaires complexes,
                  des tableaux, des graphiques, ou tout autre élément nécessaire.
                </p>
              </div>
              
              {/* Simulated long content */}
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <h5 className="font-medium mb-2">Section {i + 1}</h5>
                    <p className="text-sm text-gray-600">
                      Contenu de démonstration pour montrer le scroll. Le header reste fixe
                      pendant que vous faites défiler ce contenu.
                    </p>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>
      </FullScreenModal>
    </div>
  );
}