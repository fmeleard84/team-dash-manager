import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus } from "lucide-react";
import { useKeycloakAuth } from "@/contexts/KeycloakAuthContext";
const Header = () => {
  const { login, isAuthenticated, getUserGroups } = useKeycloakAuth();

  const handleConnect = () => {
    if (isAuthenticated) {
      const groups = getUserGroups();
      let target = '/client-dashboard';
      if (groups.includes('admin')) target = '/admin/resources';
      else if (groups.includes('candidate') || groups.includes('resource')) target = '/candidate-dashboard';
      else if (groups.includes('client')) target = '/client-dashboard';
      window.location.assign(target);
    } else {
      login();
    }
  };
  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="text-lg font-semibold">
          Plateforme de gestion
        </Link>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleConnect} className="flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Connexion
          </Button>
          
          <Button asChild>
            <Link to="/register?tab=register" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              S'inscrire
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;