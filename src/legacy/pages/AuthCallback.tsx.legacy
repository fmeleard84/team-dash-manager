import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('AuthCallback - Processing authentication...');
        console.log('Current URL:', window.location.href);
        
        // Récupérer les paramètres de l'URL (Supabase les met dans le hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        const error = hashParams.get('error');
        const error_description = hashParams.get('error_description');
        
        console.log('URL parameters:', {
          has_access_token: !!access_token,
          has_refresh_token: !!refresh_token,
          type,
          error
        });

        // Gérer les erreurs
        if (error) {
          console.error('Auth error from URL:', error, error_description);
          setError(error_description || error);
          toast.error('Erreur d\'authentification: ' + (error_description || error));
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Si on a des tokens, établir la session
        if (access_token && refresh_token) {
          console.log('Setting session with tokens...');
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });

          if (sessionError) {
            console.error('Error setting session:', sessionError);
            throw sessionError;
          }

          if (data.session) {
            console.log('Session established for user:', data.session.user.email);
            toast.success('Connexion réussie !');
            
            // Récupérer le profil pour déterminer le rôle
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', data.session.user.id)
              .single();

            console.log('User profile:', profile);

            // Rediriger selon le rôle
            if (profile?.role === 'candidate') {
              console.log('Redirecting to candidate dashboard');
              navigate('/candidate-dashboard', { replace: true });
            } else if (profile?.role === 'client') {
              console.log('Redirecting to client dashboard');
              navigate('/client-dashboard', { replace: true });
            } else if (profile?.role === 'admin') {
              console.log('Redirecting to admin dashboard');
              navigate('/admin/resources', { replace: true });
            } else {
              console.log('Unknown role, redirecting to home');
              navigate('/', { replace: true });
            }
            return;
          }
        }

        // Si pas de tokens dans l'URL, vérifier si on a déjà une session
        console.log('No tokens in URL, checking existing session...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('Existing session found for:', session.user.email);
          
          // Récupérer le profil pour déterminer le rôle
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          // Rediriger selon le rôle
          if (profile?.role === 'candidate') {
            navigate('/candidate-dashboard', { replace: true });
          } else if (profile?.role === 'client') {
            navigate('/client-dashboard', { replace: true });
          } else if (profile?.role === 'admin') {
            navigate('/admin/resources', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        } else {
          console.log('No session found, redirecting to login');
          setError('Session non trouvée');
          setTimeout(() => navigate('/login'), 2000);
        }

      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Erreur lors de l\'authentification');
        toast.error('Erreur: ' + (err.message || 'Erreur lors de l\'authentification'));
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-600" />
        <h1 className="text-xl font-semibold">
          {error ? 'Erreur de connexion' : 'Finalisation de la connexion...'}
        </h1>
        {error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <p className="text-gray-600">Merci de patienter</p>
        )}
      </div>
    </main>
  );
}