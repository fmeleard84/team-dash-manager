import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, CheckCircle2, Mail, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const EmailConfirmation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the token from URL parameters
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (type === 'signup' && token) {
          // Verify the token
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          });

          if (error) throw error;

          if (data.user) {
            setUserEmail(data.user.email || '');
            setConfirmed(true);
            toast.success('Email confirmé avec succès !');
            
            // Get user profile to determine role
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', data.user.id)
              .single();

            // Redirect after 3 seconds
            setTimeout(() => {
              if (profile?.role === 'client') {
                navigate('/client-dashboard');
              } else if (profile?.role === 'candidate') {
                navigate('/candidate-dashboard');
              } else {
                navigate('/login');
              }
            }, 3000);
          }
        } else {
          setError('Lien de confirmation invalide ou expiré');
        }
      } catch (error: any) {
        console.error('Email confirmation error:', error);
        setError(error.message || 'Erreur lors de la confirmation');
      } finally {
        setLoading(false);
      }
    };

    handleEmailConfirmation();
  }, [searchParams, navigate]);

  const resendConfirmation = async () => {
    try {
      const email = prompt('Veuillez entrer votre email pour renvoyer la confirmation :');
      if (!email) return;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) throw error;

      toast.success('Email de confirmation renvoyé !');
    } catch (error: any) {
      toast.error('Erreur lors du renvoi : ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-6 py-12">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-gray-100 bg-grid opacity-5"></div>
      
      <div className="w-full max-w-md relative z-10">
        <Card className="shadow-2xl border-0">
          <CardHeader className="space-y-1 pb-8">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <CardTitle className="text-3xl font-bold text-center">
              {loading ? 'Confirmation en cours...' : confirmed ? 'Email confirmé !' : 'Erreur de confirmation'}
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              {loading ? 'Vérification de votre email' : confirmed ? 'Votre compte Ialla est maintenant actif' : 'Un problème est survenu'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center">
            {loading ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-600" />
                <p className="text-gray-600">Vérification de votre email en cours...</p>
              </div>
            ) : confirmed ? (
              <div className="space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Félicitations !
                  </h3>
                  <p className="text-gray-600">
                    Votre email <strong>{userEmail}</strong> a été confirmé avec succès.
                  </p>
                  <p className="text-sm text-gray-500">
                    Redirection automatique vers votre tableau de bord dans 3 secondes...
                  </p>
                </div>

                <div className="space-y-3">
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    onClick={() => {
                      // Redirect immediately
                      navigate('/client-dashboard');
                    }}
                  >
                    Accéder à mon tableau de bord
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-blue-900">
                        Prochaines étapes
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Complétez votre profil et créez votre première équipe externe !
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={resendConfirmation}
                  >
                    Renvoyer l'email de confirmation
                  </Button>
                  
                  <Button 
                    variant="ghost"
                    className="w-full"
                    onClick={() => navigate('/login')}
                  >
                    Retour à la connexion
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};