import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Mail, CheckCircle, AlertCircle } from 'lucide-react';

export default function PasswordReset() {
  const [email, setEmail] = useState('fmeleard@gmail.com');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePasswordReset = async () => {
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password-confirm`,
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage(`Un email de réinitialisation a été envoyé à ${email}. Vérifiez votre boîte de réception.`);
      }
    } catch (err) {
      setError('Une erreur inattendue s\'est produite');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectLogin = async () => {
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      // Essayer de se connecter avec les identifiants fournis
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'fmeleard@gmail.com',
        password: 'R@ymonde7510'
      });

      if (error) {
        setError(`Erreur de connexion: ${error.message}`);
        
        // Si l'utilisateur n'existe pas, proposer de le créer
        if (error.message.includes('Invalid login credentials')) {
          setError('Les identifiants sont invalides. Essayez de réinitialiser le mot de passe via email.');
        }
      } else if (data?.user) {
        setMessage('Connexion réussie! Redirection...');
        
        // Vérifier le rôle
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
        
        if (profile) {
          setMessage(`Connecté avec succès! Rôle: ${profile.role}`);
          
          // Rediriger après 2 secondes
          setTimeout(() => {
            window.location.href = '/llm';
          }, 2000);
        }
      }
    } catch (err) {
      setError('Erreur inattendue lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand/5 to-brand/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-brand to-brand/80 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Réinitialisation Admin</h1>
          <p className="text-muted-foreground mt-2">
            Réinitialisez votre Password ou connectez-vous
          </p>
        </div>

        {message && (
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">EMayl</label>
            <div className="relative">
              <Mayl className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                placeholder="votre@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleDirectLogin}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Connexion...' : 'Tester la connexion directe'}
            </Button>

            <Button
              onClick={handlePasswordReset}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              {isLoading ? 'Envoi...' : 'Envoyer un email de réinitialisation'}
            </Button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Si vous n'avez pas accès à l'EMayl, vous pouvez créer un nouvel utilisateur admin via Supabase Dashboard ou utiliser les Edge Functions.
          </p>
        </div>

        <div className="mt-4 text-center">
          <a href="/" className="text-sm text-brand hover:underline">
            Back à l'accueil
          </a>
        </div>
      </Card>
    </div>
  );
}