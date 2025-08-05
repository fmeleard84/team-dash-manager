import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { useKeycloakAuth } from '@/contexts/KeycloakAuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useKeycloakAuth();
  const [activeTab, setActiveTab] = useState<'register' | 'login'>('register');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/candidate-dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

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
        toast.error("Les mots de passe ne correspondent pas");
        return;
      }

      if (formData.password.length < 6) {
        toast.error("Le mot de passe doit contenir au moins 6 caractères");
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
        toast.error(`Une erreur est survenue lors de l'inscription: ${error.message || 'Erreur inconnue'}`);
        return;
      }

      if (!data) {
        console.error('No data returned from Keycloak function');
        toast.error("Aucune donnée retournée par le service d'authentification");
        return;
      }

      console.log('User created successfully:', data);

      if (data.success) {
        toast.success("Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.");
        setActiveTab('login');
      } else {
        console.error('User creation failed:', data);
        toast.error(data.error || "L'inscription a échoué");
      }

    } catch (error) {
      console.error('Registration error:', error);
      toast.error("Une erreur inattendue s'est produite");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Chargement...</h2>
          <p className="text-muted-foreground">Vérification de votre session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Rejoindre notre équipe</CardTitle>
          <CardDescription>
            Inscrivez-vous ou connectez-vous pour accéder à votre espace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'register' | 'login')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="register">S'inscrire</TabsTrigger>
              <TabsTrigger value="login">Se connecter</TabsTrigger>
            </TabsList>

            <TabsContent value="register" className="space-y-4 mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Prénom *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Nom *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phoneNumber">Téléphone</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="password">Mot de passe *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Création...' : 'Créer mon compte'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="login" className="space-y-4 mt-4">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Connectez-vous avec votre compte Keycloak
                </p>
                <Button 
                  onClick={login} 
                  className="w-full"
                  size="lg"
                >
                  Se connecter
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-primary hover:underline">
              Retour à l'accueil
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;