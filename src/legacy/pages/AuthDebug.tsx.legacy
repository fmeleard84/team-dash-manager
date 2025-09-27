import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function AuthDebug() {
  const navigate = useNavigate();
  const [info, setInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const collectInfo = async () => {
      const debugInfo: any = {
        timestamp: new Date().toISOString(),
        url: {
          full: window.location.href,
          origin: window.location.origin,
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
        },
        urlParams: {},
        hashParams: {},
        session: null,
        user: null,
        error: null
      };

      // Parse URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.forEach((value, key) => {
        debugInfo.urlParams[key] = value;
      });

      // Parse hash parameters
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      hashParams.forEach((value, key) => {
        debugInfo.hashParams[key] = value;
      });

      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        debugInfo.session = session ? {
          user_id: session.user.id,
          email: session.user.email,
          expires_at: session.expires_at,
          token_type: session.token_type
        } : null;
        debugInfo.sessionError = error;

        // Get user
        const { data: { user } } = await supabase.auth.getUser();
        debugInfo.user = user ? {
          id: user.id,
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          created_at: user.created_at,
          role: user.role
        } : null;

      } catch (err: any) {
        debugInfo.error = err.message;
      }

      setInfo(debugInfo);
      setLoading(false);
    };

    collectInfo();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      setInfo(prev => ({
        ...prev,
        lastAuthEvent: {
          event,
          timestamp: new Date().toISOString(),
          user: session?.user?.email
        }
      }));
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleManualVerification = async () => {
    const token = prompt('Entrez le token de vérification (depuis l\'URL du mail):');
    if (!token) return;

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'signup'
      });

      if (error) {
        alert('Erreur: ' + error.message);
        return;
      }

      if (data?.session) {
        alert('Succès ! Redirection...');
        window.location.href = '/auth/callback';
      }
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Debug Auth - Informations de débogage</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Chargement...</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Informations de debug:</h3>
                  <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
                    {JSON.stringify(info, null, 2)}
                  </pre>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={() => window.location.reload()}>
                    Rafraîchir
                  </Button>
                  <Button onClick={handleManualVerification} variant="outline">
                    Vérifier manuellement un token
                  </Button>
                  <Button onClick={() => navigate('/login')} variant="outline">
                    Retour connexion
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}