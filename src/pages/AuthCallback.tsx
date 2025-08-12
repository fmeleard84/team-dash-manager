import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // This page is no longer needed with our new auth system
    // Redirect to auth page
    navigate('/auth');
  }, [navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">Redirection...</h1>
        <p className="text-muted-foreground">Redirection vers la page de connexion</p>
      </div>
    </main>
  );
}