/**
 * Module AUTH - Composant ForgotPasswordForm
 *
 * Formulaire de mot de passe oublié basé sur l'implémentation existante dans PasswordReset.tsx.
 * Conserve EXACTEMENT les mêmes logiques métier.
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import { useState } from 'react';
import { Button } from '@/ui/components/button';
import { Input } from '@/ui/components/input';
import { Label } from '@/ui/components/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ui/components/card';
import { Alert, AlertDescription } from '@/ui/components/alert';
import { Loader2, Mail, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ForgotPasswordFormProps } from '../types';

/**
 * Formulaire de mot de passe oublié modulaire
 * CONSERVE EXACTEMENT la logique de PasswordReset.tsx
 */
export const ForgotPasswordForm = ({
  onSubmit,
  onBackToLogin,
  initialEmail = '',
  isLoading = false,
  error = null,
  success = false,
  className = '',
  showBackButton = true
}: ForgotPasswordFormProps) => {
  // État local (EXACTEMENT comme dans PasswordReset.tsx)
  const [email, setEmail] = useState(initialEmail);

  // Gestion de soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (onSubmit) {
      await onSubmit({ email });
    }
  };

  return (
    <div className={cn('w-full max-w-md', className)}>
      <Card>
        <CardHeader className="text-center">
          {/* Icône et titre (inspiré de PasswordReset.tsx) */}
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
          <CardDescription>
            Entrez votre email pour recevoir un lien de réinitialisation
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Messages d'état (EXACTEMENT comme dans PasswordReset.tsx) */}
          {success && (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Un email de réinitialisation a été envoyé. Vérifiez votre boîte de réception.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email (EXACTEMENT comme dans PasswordReset.tsx) */}
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="votre@email.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Bouton d'envoi (EXACTEMENT comme dans PasswordReset.tsx) */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                'Envoyer le lien de réinitialisation'
              )}
            </Button>
          </form>

          {/* Note d'aide (inspirée de PasswordReset.tsx) */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Si vous ne recevez pas l'email dans les prochaines minutes,
              vérifiez votre dossier de spam ou contactez l'administration.
            </p>
          </div>

          {/* Bouton retour */}
          {showBackButton && (
            <div className="mt-4 text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm text-muted-foreground hover:text-primary p-0"
                onClick={onBackToLogin}
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la connexion
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordForm;