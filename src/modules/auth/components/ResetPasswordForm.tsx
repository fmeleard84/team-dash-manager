/**
 * Module AUTH - Composant ResetPasswordForm
 *
 * Formulaire de réinitialisation de mot de passe.
 * Utilise la même logique de validation que les autres composants d'authentification.
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
import { Loader2, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ResetPasswordFormProps } from '../types';

/**
 * Formulaire de réinitialisation de mot de passe
 */
export const ResetPasswordForm = ({
  onSubmit,
  token,
  isLoading = false,
  error = null,
  success = false,
  className = ''
}: ResetPasswordFormProps) => {
  // État local
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation en temps réel
  const isPasswordMatch = formData.password === formData.confirmPassword;
  const isPasswordValid = formData.password.length >= 6;

  // Gestion de soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation côté client
    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit faire au moins 6 caractères');
      return;
    }

    if (onSubmit) {
      await onSubmit({
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        token
      });
    }
  };

  return (
    <div className={cn('w-full max-w-md', className)}>
      <Card>
        <CardHeader className="text-center">
          {/* Icône et titre */}
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
          <CardDescription>
            Choisissez un nouveau mot de passe sécurisé
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Messages d'état */}
          {success && (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Mot de passe mis à jour avec succès ! Vous pouvez maintenant vous connecter.
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
            {/* Nouveau mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  disabled={isLoading}
                  minLength={6}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {formData.password && !isPasswordValid && (
                <p className="text-sm text-red-500">
                  Le mot de passe doit faire au moins 6 caractères
                </p>
              )}
            </div>

            {/* Confirmation mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirmer le nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {formData.confirmPassword && !isPasswordMatch && (
                <p className="text-sm text-red-500">
                  Les mots de passe ne correspondent pas
                </p>
              )}
            </div>

            {/* Indicateur de force du mot de passe */}
            {formData.password && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Force du mot de passe :</div>
                <div className="flex space-x-1">
                  <div className={cn(
                    "h-2 flex-1 rounded",
                    formData.password.length >= 6 ? "bg-green-500" : "bg-gray-200"
                  )} />
                  <div className={cn(
                    "h-2 flex-1 rounded",
                    formData.password.length >= 8 && /[0-9]/.test(formData.password) ? "bg-green-500" : "bg-gray-200"
                  )} />
                  <div className={cn(
                    "h-2 flex-1 rounded",
                    formData.password.length >= 10 && /[0-9]/.test(formData.password) && /[!@#$%^&*]/.test(formData.password) ? "bg-green-500" : "bg-gray-200"
                  )} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {formData.password.length < 6 && "Trop court"}
                  {formData.password.length >= 6 && formData.password.length < 8 && "Faible"}
                  {formData.password.length >= 8 && /[0-9]/.test(formData.password) && "Moyen"}
                  {formData.password.length >= 10 && /[0-9]/.test(formData.password) && /[!@#$%^&*]/.test(formData.password) && "Fort"}
                </div>
              </div>
            )}

            {/* Bouton de réinitialisation */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !isPasswordMatch || !isPasswordValid}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                'Mettre à jour le mot de passe'
              )}
            </Button>
          </form>

          {/* Conseils de sécurité */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Conseils pour un mot de passe sécurisé :</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Au moins 6 caractères (8+ recommandés)</li>
              <li>• Mélange de lettres et chiffres</li>
              <li>• Ajoutez des caractères spéciaux (!@#$%^&*)</li>
              <li>• Évitez les mots du dictionnaire</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordForm;