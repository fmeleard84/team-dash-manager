/**
 * Module AUTH - Composant RegisterForm
 *
 * Formulaire d'inscription basé sur l'implémentation existante dans Auth.tsx.
 * Conserve EXACTEMENT les mêmes logiques métier et validation.
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import { useState } from 'react';
import { Button } from '@/ui/components/button';
import { Input } from '@/ui/components/input';
import { Label } from '@/ui/components/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ui/components/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/components/select';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { RegisterFormProps } from '../types';

/**
 * Formulaire d'inscription modulaire
 * CONSERVE EXACTEMENT l'UI et la logique d'Auth.tsx (TabsContent register)
 */
export const RegisterForm = ({
  onSubmit,
  onLoginClick,
  initialData = {},
  isLoading = false,
  error = null,
  className = '',
  allowRoleSelection = true,
  defaultRole = 'candidate',
  showLoginLink = true
}: RegisterFormProps) => {
  // État local (EXACTEMENT comme dans Auth.tsx)
  const [formData, setFormData] = useState({
    email: initialData.email || '',
    password: '',
    confirmPassword: '',
    firstName: initialData.firstName || '',
    lastName: initialData.lastName || '',
    phone: initialData.phone || '',
    companyName: initialData.companyName || '',
    role: (initialData.role || defaultRole) as 'client' | 'candidate'
  });

  // Validation en temps réel
  const isPasswordMatch = formData.password === formData.confirmPassword;
  const isPasswordValid = formData.password.length >= 6;

  // Gestion de soumission (EXACTEMENT comme dans Auth.tsx)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation côté client (EXACTEMENT comme dans Auth.tsx)
    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit faire au moins 6 caractères');
      return;
    }

    // Debug: afficher ce qu'on envoie (EXACTEMENT comme dans Auth.tsx)
    console.log('📱 REGISTER FORM DATA:', {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      companyName: formData.companyName,
      role: formData.role
    });

    if (onSubmit) {
      await onSubmit({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,  // EXACTEMENT comme firstName et lastName
        companyName: formData.companyName,
        role: formData.role
      });
    }
  };

  return (
    <div className={cn('w-full max-w-md', className)}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Inscription</CardTitle>
          <CardDescription>
            Créez votre compte pour commencer
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Prénom et Nom (EXACTEMENT comme dans Auth.tsx) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  placeholder="Jean"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  placeholder="Dupont"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email (EXACTEMENT comme dans Auth.tsx) */}
            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <Input
                id="register-email"
                type="email"
                placeholder="votre@email.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                disabled={isLoading}
              />
            </div>

            {/* Téléphone (EXACTEMENT comme dans Auth.tsx) */}
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone (optionnel)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+33 1 23 45 67 89"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                disabled={isLoading}
              />
            </div>

            {/* Sélection rôle (EXACTEMENT comme dans Auth.tsx) */}
            {allowRoleSelection && (
              <div className="space-y-2">
                <Label htmlFor="role">Je suis</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'client' | 'candidate') =>
                    setFormData(prev => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="candidate">Un candidat/freelance</SelectItem>
                    <SelectItem value="client">Un client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Nom entreprise conditionnel (EXACTEMENT comme dans Auth.tsx) */}
            {formData.role === 'client' && (
              <div className="space-y-2">
                <Label htmlFor="companyName">Nom de l'entreprise (optionnel)</Label>
                <Input
                  id="companyName"
                  placeholder="Ma Société SARL"
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Mot de passe (EXACTEMENT comme dans Auth.tsx) */}
            <div className="space-y-2">
              <Label htmlFor="register-password">Mot de passe</Label>
              <Input
                id="register-password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                disabled={isLoading}
                minLength={6}
                autoComplete="new-password"
              />
              {formData.password && !isPasswordValid && (
                <p className="text-sm text-red-500">
                  Le mot de passe doit faire au moins 6 caractères
                </p>
              )}
            </div>

            {/* Confirmation mot de passe (EXACTEMENT comme dans Auth.tsx) */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              {formData.confirmPassword && !isPasswordMatch && (
                <p className="text-sm text-red-500">
                  Les mots de passe ne correspondent pas
                </p>
              )}
            </div>

            {/* Affichage erreur */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Bouton inscription (EXACTEMENT comme dans Auth.tsx) */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !isPasswordMatch || !isPasswordValid}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer mon compte
            </Button>
          </form>

          {/* Lien connexion */}
          {showLoginLink && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Déjà un compte ?{' '}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-medium text-primary hover:underline"
                  onClick={onLoginClick}
                  disabled={isLoading}
                >
                  Se connecter
                </Button>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterForm;