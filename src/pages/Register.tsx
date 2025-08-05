import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
  console.log('=== Register component mounted ===');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    console.log('=== Registration process started ===');
    console.log('Supabase client configuration:', {
      url: 'https://egdelmcijszuapcpglsy.supabase.co',
      hasAnonymousKey: !!supabase
    });

    try {
      // Test edge function connectivity first
      console.log('Testing edge function connectivity...');
      try {
        const healthCheck = await supabase.functions.invoke('keycloak-user-management', {
          body: { action: 'health-check' }
        });
        console.log('Health check result:', healthCheck);
      } catch (healthError) {
        console.error('Health check failed:', healthError);
      }
      // Validate form
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Erreur",
          description: "Les mots de passe ne correspondent pas",
          variant: "destructive",
        });
        return;
      }

      if (formData.password.length < 6) {
        toast({
          title: "Erreur",
          description: "Le mot de passe doit contenir au moins 6 caractères",
          variant: "destructive",
        });
        return;
      }

      // Create user via Keycloak edge function
      console.log('Attempting to create user via Keycloak...');
      console.log('Form data:', { 
        email: formData.email, 
        firstName: formData.firstName, 
        lastName: formData.lastName, 
        phoneNumber: formData.phoneNumber 
      });
      
      const { data, error } = await supabase.functions.invoke('keycloak-user-management', {
        body: {
          action: 'create-user',
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          password: formData.password,
        },
      });

      console.log('Keycloak function response:', { data, error });

      if (error) {
        console.error('Keycloak function error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast({
          title: "Erreur d'inscription",
          description: `Une erreur est survenue lors de l'inscription: ${error.message || 'Erreur inconnue'}`,
          variant: "destructive",
        });
        return;
      }

      if (!data) {
        console.error('No data returned from Keycloak function');
        toast({
          title: "Erreur",
          description: "Aucune donnée retournée par le service d'authentification",
          variant: "destructive",
        });
        return;
      }

      console.log('User created successfully:', data);

      if (data.success) {
        toast({
          title: "Inscription réussie",
          description: "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.",
        });
        navigate('/auth');
      } else {
        console.error('User creation failed:', data);
        toast({
          title: "Erreur d'inscription",
          description: data.error || "L'inscription a échoué",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Inscription</CardTitle>
          <CardDescription>
            Créez votre compte pour accéder à la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Numéro de téléphone</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Inscription en cours...' : 'S\'inscrire'}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Vous avez déjà un compte ?{' '}
              <Link to="/auth" className="text-primary hover:underline">
                Se connecter
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;