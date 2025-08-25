import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus, Sparkles, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { IallaLogo } from "@/components/IallaLogo";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
const Header = () => {
  const { isAuthenticated, user } = useAuth();
  const { notifications } = useNotifications();
  const unreadCount = notifications.filter(n => n.status === 'unread').length;

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
    <header className="w-full border-b border-gray-200/50 bg-white/80 backdrop-blur-sm shadow-sm">
      <div className="container flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <IallaLogo size="md" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent group-hover:from-purple-700 group-hover:to-pink-700 transition-all">
              Plateforme Teams
            </span>
          </div>
        </Link>
        
        <div className="flex items-center gap-4">
          {isAuthenticated && (
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="relative hover:bg-purple-50 hover:text-purple-700 transition-all duration-200 rounded-xl"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[500px] p-0" align="end">
                <NotificationCenter />
              </PopoverContent>
            </Popover>
          )}
          
          <Button 
            variant="ghost" 
            onClick={handleConnect} 
            className="flex items-center gap-2 hover:bg-purple-50 hover:text-purple-700 transition-all duration-200 rounded-xl"
          >
            <LogIn className="h-4 w-4" />
            <span className="font-medium">Connexion</span>
          </Button>
          
          <Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
            <Link to="/auth" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="font-medium">S'inscrire</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;