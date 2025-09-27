/**
 * Module AUTH - Composant LoginForm
 *
 * Formulaire de connexion basé sur l'implémentation existante dans Auth.tsx.
 * Conserve EXACTEMENT les mêmes logiques métier et UI patterns.
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import { useState } from 'react';
import { Button } from '@/ui/components/button';
import { Input } from '@/ui/components/input';
import { Label } from '@/ui/components/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ui/components/card';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LoginFormProps } from '../types';

/**
 * Formulaire de connexion modulaire
 * CONSERVE EXACTEMENT l'UI et la logique d'Auth.tsx (TabsContent login)
 */
export const LoginForm = ({
  onSubmit,
  onRegisterClick,
  onForgotPasswordClick,
  initialEmail = '',
  isLoading = false,
  error = null,
  className = '',
  showRememberMe = false,
  showForgotPassword = true,
  showRegisterLink = true
}: LoginFormProps) => {
  // État local (EXACTEMENT comme dans Auth.tsx)
  const [formData, setFormData] = useState({
    email: initialEmail,
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);

  // Gestion de soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (onSubmit) {
      await onSubmit({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe
      });
    }
  };

  return (
    <div className={cn('w-full max-w-md', className)}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <CardDescription>
            Connectez-vous à votre compte
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email (EXACTEMENT comme dans Auth.tsx) */}
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="votre@email.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            {/* Mot de passe avec toggle visibilité (EXACTEMENT comme dans Auth.tsx) */}
            <div className="space-y-2">
              <Label htmlFor="login-password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
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
            </div>

            {/* Remember Me (optionnel) */}
            {showRememberMe && (
              <div className="flex items-center space-x-2">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="remember-me" className="text-sm">
                  Se souvenir de moi
                </Label>
              </div>
            )}

            {/* Affichage erreur */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Bouton connexion (EXACTEMENT comme dans Auth.tsx) */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter
            </Button>

            {/* Lien mot de passe oublié */}
            {showForgotPassword && (
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-muted-foreground hover:text-primary p-0"
                  onClick={onForgotPasswordClick}
                  disabled={isLoading}
                >
                  Mot de passe oublié ?
                </Button>
              </div>
            )}
          </form>

          {/* Comptes de demo (EXACTEMENT comme dans Auth.tsx) */}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Comptes de demo :</p>
            <p className="text-xs mt-2">
              <strong>Admin:</strong> admin@example.com<br />
              <strong>Client:</strong> client@example.com<br />
              <strong>Candidat:</strong> candidate@example.com<br />
              <em>Mot de passe: password</em>
            </p>
          </div>

          {/* Lien inscription */}
          {showRegisterLink && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Pas encore de compte ?{' '}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-medium text-primary hover:underline"
                  onClick={onRegisterClick}
                  disabled={isLoading}
                >
                  Créer un compte
                </Button>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;