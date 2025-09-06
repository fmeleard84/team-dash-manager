import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Sparkles, 
  Mail, 
  Lock, 
  User, 
  Building2, 
  ArrowLeft, 
  Loader2,
  CheckCircle,
  Briefcase
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('invitation');
  const invitationType = searchParams.get('type');
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'client' | 'candidate' | 'team_member'>('client');
  const [teamMemberInfo, setTeamMemberInfo] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    companyName: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingInvitation, setLoadingInvitation] = useState(false);

  // Check for team member invitation
  useEffect(() => {
    if (invitationToken && invitationType === 'team_member') {
      setLoadingInvitation(true);
      setRole('team_member');
      
      // Fetch team member info using the token
      supabase
        .rpc('get_team_member_by_token', { token: invitationToken })
        .then(({ data, error }) => {
          if (error || !data || data.length === 0) {
            setError('Invitation invalide ou expirée');
            toast.error('Invitation invalide ou expirée');
          } else {
            const member = data[0];
            setTeamMemberInfo(member);
            // Pre-fill form with team member data
            setFormData(prev => ({
              ...prev,
              email: member.email,
              firstName: member.first_name,
              lastName: member.last_name
            }));
            toast.success(`Bienvenue ${member.first_name} ! Créez votre compte pour rejoindre l'équipe.`);
          }
        })
        .finally(() => setLoadingInvitation(false));
    }
  }, [invitationToken, invitationType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const validateStep1 = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      }
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Sign up user with email confirmation disabled for dev
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: role === 'team_member' ? 'client' : role,
            is_team_member: role === 'team_member'
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/email-confirmation`
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to update the profile (it should have been created by trigger)
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: formData.firstName,
            last_name: formData.lastName,
            company_name: role === 'client' && !teamMemberInfo ? formData.companyName : null,
            phone: formData.phone,
            role: role === 'team_member' ? 'client' : role
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.warn('Could not update profile, will try to create it:', profileError);
          
          // If update fails, try to create the profile
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: formData.email,
              first_name: formData.firstName,
              last_name: formData.lastName,
              company_name: role === 'client' && !teamMemberInfo ? formData.companyName : null,
              phone: formData.phone,
              role: role === 'team_member' ? 'client' : role
            });

          if (createError) {
            console.error('Error creating profile:', createError);
            // Continue anyway, profile might exist
          }
        }

        // If team member, link the account to the invitation
        if (role === 'team_member' && teamMemberInfo && authData.user) {
          const { error: linkError } = await supabase
            .from('client_team_members')
            .update({
              user_id: authData.user.id,
              invitation_accepted_at: new Date().toISOString()
            })
            .eq('id', teamMemberInfo.id);

          if (linkError) {
            console.error('Error linking team member:', linkError);
          } else {
            toast.success('Votre compte a été lié à votre équipe !');
          }
        }

        // Check if email confirmation is required
        if (!authData.session) {
          // Email confirmation required
          toast.success('Compte créé ! Vérifiez votre email pour confirmer votre inscription.');
          setStep(3); // Show confirmation step
          return;
        }

        toast.success('Compte créé avec succès !');
        
        // Small delay to ensure session is established
        setTimeout(() => {
          // Redirect based on role
          if (role === 'client') {
            navigate('/client-dashboard');
          } else {
            navigate('/candidate-dashboard');
          }
        }, 500);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-6 py-12">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/src/assets/new_user.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Dark overlay for better readability */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Back to Home */}
        <Link to="/" className="inline-flex items-center gap-2 text-white hover:text-gray-200 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l'accueil</span>
        </Link>

        <Card className="shadow-2xl border-0">
          <CardHeader className="space-y-1 pb-8">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <CardTitle className="text-3xl font-bold text-center">
              {teamMemberInfo ? `Rejoignez l'équipe de ${teamMemberInfo.client_name}` : 'Créez votre compte Ialla'}
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              {teamMemberInfo && step === 1 ? `Vous êtes invité(e) en tant que ${teamMemberInfo.job_title}` :
               step === 1 ? 'Commencez par vos informations de connexion' : 
               step === 2 ? 'Finalisez votre profil' : 
               'Confirmez votre email'}
            </CardDescription>

            {/* Progress Steps */}
            <div className="flex justify-center mt-6">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
                </div>
                <div className={`w-16 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {step > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
                </div>
                <div className={`w-16 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  3
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email professionnel</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="vous@entreprise.com"
                        value={formData.email}
                        onChange={handleChange}
                        className="pl-10"
                        autoComplete="email"
                        disabled={!!teamMemberInfo}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Minimum 6 caractères"
                        value={formData.password}
                        onChange={handleChange}
                        className="pl-10"
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirmez votre mot de passe"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="pl-10"
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  {!teamMemberInfo && (
                  <div className="space-y-3">
                    <Label>Vous êtes ?</Label>
                    <RadioGroup value={role} onValueChange={(value) => setRole(value as 'client' | 'candidate')}>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <RadioGroupItem value="client" id="client" />
                        <Label htmlFor="client" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="font-medium">Client</p>
                            <p className="text-sm text-gray-500">Je souhaite constituer une équipe</p>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <RadioGroupItem value="candidate" id="candidate" />
                        <Label htmlFor="candidate" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Briefcase className="w-4 h-4 text-purple-600" />
                          <div>
                            <p className="font-medium">Expert</p>
                            <p className="text-sm text-gray-500">Je souhaite rejoindre des équipes</p>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="Jean"
                        value={formData.firstName}
                        onChange={handleChange}
                        autoComplete="given-name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Dupont"
                        value={formData.lastName}
                        onChange={handleChange}
                        autoComplete="family-name"
                        required
                      />
                    </div>
                  </div>

                  {role === 'client' && !teamMemberInfo && (
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Nom de l'entreprise</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="companyName"
                          name="companyName"
                          placeholder="Votre entreprise"
                          value={formData.companyName}
                          onChange={handleChange}
                          className="pl-10"
                          autoComplete="organization"
                          required={role === 'client'}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone (optionnel)</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+33 6 12 34 56 78"
                      value={formData.phone}
                      onChange={handleChange}
                      autoComplete="tel"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="w-10 h-10 text-blue-600" />
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Vérifiez votre email
                    </h3>
                    <p className="text-gray-600">
                      Nous avons envoyé un email de confirmation à :
                    </p>
                    <p className="font-semibold text-blue-600">
                      {formData.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      Cliquez sur le lien dans l'email pour activer votre compte.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-blue-900">
                          Email non reçu ?
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          Vérifiez vos spams ou cliquez ci-dessous pour renvoyer l'email.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {step === 1 && (
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    size="lg"
                  >
                    Continuer
                  </Button>
                )}

                {step === 2 && (
                  <div className="space-y-3">
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      size="lg"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Création en cours...
                        </>
                      ) : (
                        'Créer mon compte'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setStep(1)}
                    >
                      Retour
                    </Button>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        try {
                          const { error } = await supabase.auth.resend({
                            type: 'signup',
                            email: formData.email,
                            options: {
                              emailRedirectTo: `${window.location.origin}/auth/callback?next=/email-confirmation`
                            }
                          });
                          if (error) throw error;
                          toast.success('Email de confirmation renvoyé !');
                        } catch (error: any) {
                          console.error('Resend error:', error);
                          toast.error('Erreur lors du renvoi : ' + error.message);
                        }
                      }}
                    >
                      Renvoyer l'email de confirmation
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => navigate('/login')}
                    >
                      J'ai déjà confirmé mon email
                    </Button>
                  </div>
                )}

                <div className="text-center">
                  <p className="text-gray-600">
                    Vous avez déjà un compte ?{' '}
                    <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                      Se connecter
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Loading Invitation */}
        {loadingInvitation && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Vérification de votre invitation...</p>
            </div>
          </div>
        )}

        {/* Trust Indicators */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>🔒 Inscription 100% sécurisée • Sans engagement</p>
        </div>
      </div>
    </div>
  );
};