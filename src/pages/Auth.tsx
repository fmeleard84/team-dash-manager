import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useKeycloakAuth } from '@/contexts/KeycloakAuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Auth = () => {
  const { login, isAuthenticated, isLoading } = useKeycloakAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

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
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
          <CardDescription>
            Connectez-vous à votre compte pour accéder à la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={login} 
            className="w-full"
            size="lg"
          >
            Se connecter avec Keycloak
          </Button>

          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">
              Pas encore de compte ?
            </div>
            <Link to="/register">
              <Button variant="outline" className="w-full">
                Créer un compte
              </Button>
            </Link>
          </div>

          <div className="text-center">
            <Link to="/" className="text-sm text-primary hover:underline">
              Retour à l'accueil
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;