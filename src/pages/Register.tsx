import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useKeycloakAuth } from '@/contexts/KeycloakAuthContext';
import { keycloak } from '@/lib/keycloak';


const Register = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, hasGroup, getUserGroups, user } = useKeycloakAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'register' | 'login'>(
    (searchParams.get('tab') as 'register' | 'login') || 'register'
  );
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    profileType: 'resource' as 'client' | 'resource',
    companyName: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      console.log('User authenticated, checking groups...');
      console.log('User object:', user);
      console.log('User profile:', user?.profile);
      
      // Small delay to ensure groups are loaded from Keycloak
      setTimeout(() => {
        console.log('Checking user groups for redirection...');
        const groups = getUserGroups();
        console.log('All user groups:', groups);
        console.log('hasGroup(client):', hasGroup('client'));
        console.log('hasGroup(candidate):', hasGroup('candidate'));
        console.log('hasGroup(resource):', hasGroup('resource'));
        console.log('hasGroup(admin):', hasGroup('admin'));
        
        if (hasGroup('client')) {
          console.log('User has client group, redirecting to client dashboard');
          navigate('/client-dashboard');
        } else if (hasGroup('candidate') || hasGroup('resource')) {
          console.log('User has candidate/resource group, redirecting to candidate dashboard');
          navigate('/candidate-dashboard');
        } else if (hasGroup('admin')) {
          console.log('User has admin group, redirecting to admin resources');
          navigate('/admin/resources');
        } else {
          console.log('No specific group found, redirecting to client dashboard');
          navigate('/client-dashboard');
        }
      }, 1000);
    }
  }, [isAuthenticated, navigate, hasGroup, getUserGroups, user]);

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
          headers: { 'x-debug-trace': 'true' },
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
        headers: { 'x-debug-trace': 'true' },
        body: {
          action: 'create-user',
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          password: formData.password,
          profileType: formData.profileType,
          companyName: formData.companyName,
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
        const already = data.alreadyExisted === true;

        if (!already) {
          // Add the user to the selected group explicitly (email + group) as a safety net
          const group = formData.profileType === 'client' ? 'client' : 'ressources';
          const addGroup = await supabase.functions.invoke('keycloak-user-management', {
            headers: { 'x-debug-trace': 'true' },
            body: {
              action: 'add-user-to-group',
              email: formData.email,
              group,
            },
          });

          if (addGroup.error || addGroup.data?.error) {
            console.error('Group assignment failed:', addGroup.error || addGroup.data?.error);
            toast.error(`Compte créé mais l'ajout au groupe a échoué: ${addGroup.data?.error || addGroup.error?.message || ''}`);
          } else {
            toast.success("Votre compte a été créé et ajouté au groupe avec succès. Vous pouvez maintenant vous connecter.");
          }
        } else {
          toast.success("Ce compte existe déjà et a été synchronisé. Vous pouvez maintenant vous connecter.");
        }

        try {
          console.log('[Register] Auto-login after registration to root (post-login redirect will route to dashboard)');
          await keycloak.login({ redirectUri: window.location.origin + '/' });
        } catch (e) {
          console.error('[Register] Auto-login failed, falling back to manual login tab:', e);
          setActiveTab('login');
        }
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
                      autoComplete="given-name"
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
                      autoComplete="family-name"
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
                    autoComplete="email"
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
                    autoComplete="tel"
                  />
                </div>

                <div>
                  <Label htmlFor="profileType">Type de profil *</Label>
                  <Select
                    value={formData.profileType}
                    onValueChange={(value: 'client' | 'resource') =>
                      setFormData({ ...formData, profileType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resource">Ressource (Je veux travailler sur des projets)</SelectItem>
                      <SelectItem value="client">Client (Je veux créer des projets)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.profileType === 'client' && (
                  <div>
                    <Label htmlFor="companyName">Nom de l'entreprise</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      type="text"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="Optionnel"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="password">Mot de passe *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
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
                    autoComplete="new-password"
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
                  onClick={() => {
                    console.log('[Register] === LOGIN BUTTON CLICKED ===');
                    console.log('[Register] Current URL:', window.location.href);
                    console.log('[Register] Auth state:', { 
                      isAuthenticated, 
                      isLoading, 
                      hasUser: !!user,
                      userGroups: getUserGroups(),
                      userEmail: user?.profile?.email,
                      userSub: user?.profile?.sub
                    });
                    
                    // Additional Keycloak debug info
                    console.log('[Register] Direct Keycloak state check:', {
                      authenticated: (window as any).keycloak?.authenticated,
                      token: !!(window as any).keycloak?.token,
                      tokenParsed: !!(window as any).keycloak?.tokenParsed
                    });
                    
                    try {
                      console.log('[Register] Calling login()...');
                      login();
                    } catch (error) {
                      console.error('[Register] Login error:', error);
                    }
                  }} 
                  className="w-full"
                  size="lg"
                >
                  Se connecter
                </Button>
                
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium mb-2">État de l'authentification :</p>
                  <div className="text-xs space-y-1">
                    <div>En cours de chargement : {isLoading ? 'Oui' : 'Non'}</div>
                    <div>Authentifié : {isAuthenticated ? 'Oui' : 'Non'}</div>
                    <div>Groupes utilisateur : {isAuthenticated ? getUserGroups().join(', ') || 'Aucun' : 'Non connecté'}</div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
