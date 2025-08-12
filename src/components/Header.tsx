import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
const Header = () => {
  const { isAuthenticated, user } = useAuth();

  const handleConnect = () => {
    if (isAuthenticated && user) {
      let target = '/client-dashboard';
      if (user.role === 'admin') target = '/admin/resources';
      else if (user.role === 'candidate') target = '/candidate-dashboard';
      else if (user.role === 'client') target = '/client-dashboard';
      window.location.href = target;
    } else {
      window.location.href = '/auth';
    }
  };
  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="text-lg font-semibold">
          Plateforme de gestion
        </Link>
        
        <div className="flex items-center gap-4">
          {isAuthenticated && <NotificationCenter />}
          
          <Button variant="ghost" onClick={handleConnect} className="flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Connexion
          </Button>
          
          <Button asChild>
            <Link to="/auth" className="flex items-center gap-2">
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