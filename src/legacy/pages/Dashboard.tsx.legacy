import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/auth');
      return;
    }

    // Redirect based on user role
    switch (user.role) {
      case 'admin':
        navigate('/admin/resources');
        break;
      case 'candidate':
        navigate('/candidate-dashboard');
        break;
      case 'client':
        navigate('/client-dashboard');
        break;
      default:
        navigate('/candidate-dashboard');
        break;
    }
  }, [user, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Redirection vers votre dashboard...</p>
    </div>
  );
};

export default Dashboard;