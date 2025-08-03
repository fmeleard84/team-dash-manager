import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { X, Eye, EyeOff } from "lucide-react";

interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface ProfileData {
  categoryId: string;
  seniority: string;
  languages: string[];
  expertises: string[];
  dailyRate: number;
}

const Team = () => {
  const [step, setStep] = useState<'auth' | 'verify' | 'profile' | 'complete'>('auth');
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('signup');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Auth form data
  const [signupData, setSignupData] = useState<SignupData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  
  // Verification
  const [verificationCode, setVerificationCode] = useState('');
  
  // Profile data
  const [profileData, setProfileData] = useState<ProfileData>({
    categoryId: '',
    seniority: 'junior',
    languages: [],
    expertises: [],
    dailyRate: 200
  });

  // Login form
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // Fetch categories, languages, and expertises
  const { data: categories } = useQuery({
    queryKey: ['hr-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_categories').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: languages } = useQuery({
    queryKey: ['hr-languages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_languages').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: expertises } = useQuery({
    queryKey: ['hr-expertises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_expertises')
        .select('*, hr_categories(name)')
        .eq('category_id', profileData.categoryId);
      if (error) throw error;
      return data;
    },
    enabled: !!profileData.categoryId
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await supabase.functions.invoke('candidate-auth/signup', {
        body: signupData
      });

      if (response.error) throw response.error;

      toast.success("Compte créé ! Vérifiez vos emails pour le code de vérification.");
      setStep('verify');
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await supabase.functions.invoke('candidate-auth/login', {
        body: loginData
      });

      if (response.error) throw response.error;

      const { data } = response;
      if (data.needsVerification) {
        setSignupData(prev => ({ ...prev, email: loginData.email }));
        setStep('verify');
        toast.info("Veuillez vérifier votre email avant de vous connecter");
      } else {
        toast.success("Connexion réussie !");
        // Redirect to dashboard
        window.location.href = '/candidate-dashboard';
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    setLoading(true);

    try {
      const response = await supabase.functions.invoke('candidate-auth/verify-email', {
        body: {
          email: signupData.email,
          code: verificationCode
        }
      });

      if (response.error) throw response.error;

      toast.success("Email vérifié avec succès !");
      setStep('profile');
    } catch (error: any) {
      toast.error(error.message || "Code de vérification incorrect");
    } finally {
      setLoading(false);
    }
  };

  const addLanguage = (languageId: string) => {
    if (!profileData.languages.includes(languageId)) {
      setProfileData(prev => ({
        ...prev,
        languages: [...prev.languages, languageId]
      }));
    }
  };

  const removeLanguage = (languageId: string) => {
    setProfileData(prev => ({
      ...prev,
      languages: prev.languages.filter(id => id !== languageId)
    }));
  };

  const addExpertise = (expertiseId: string) => {
    if (!profileData.expertises.includes(expertiseId)) {
      setProfileData(prev => ({
        ...prev,
        expertises: [...prev.expertises, expertiseId]
      }));
    }
  };

  const removeExpertise = (expertiseId: string) => {
    setProfileData(prev => ({
      ...prev,
      expertises: prev.expertises.filter(id => id !== expertiseId)
    }));
  };

  const calculateHourlyRate = () => (profileData.dailyRate / 8).toFixed(2);
  const calculateMinuteRate = () => (profileData.dailyRate / (8 * 60)).toFixed(2);

  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Vérification Email</CardTitle>
            <p className="text-muted-foreground">
              Un code de vérification a été envoyé à {signupData.email}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Code de vérification</Label>
              <Input
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
            </div>
            <Button 
              onClick={handleVerifyEmail} 
              disabled={loading || verificationCode.length !== 6}
              className="w-full"
            >
              {loading ? "Vérification..." : "Vérifier"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Complétez votre profil</CardTitle>
              <p className="text-muted-foreground">
                Renseignez vos compétences et votre tarification
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category Selection */}
              <div>
                <Label>Fonction</Label>
                <Select 
                  value={profileData.categoryId} 
                  onValueChange={(value) => setProfileData(prev => ({ ...prev, categoryId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez votre fonction" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seniority */}
              <div>
                <Label>Niveau d'expérience</Label>
                <Select 
                  value={profileData.seniority} 
                  onValueChange={(value) => setProfileData(prev => ({ ...prev, seniority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="intermediate">Intermédiaire</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Languages */}
              <div>
                <Label>Langues parlées</Label>
                <Select onValueChange={addLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ajouter une langue" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages?.filter(lang => !profileData.languages.includes(lang.id)).map((language) => (
                      <SelectItem key={language.id} value={language.id}>
                        {language.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profileData.languages.map((langId) => {
                    const language = languages?.find(l => l.id === langId);
                    return (
                      <Badge key={langId} variant="secondary" className="flex items-center gap-1">
                        {language?.name}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeLanguage(langId)}
                        />
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Expertises */}
              {profileData.categoryId && (
                <div>
                  <Label>Compétences</Label>
                  <Select onValueChange={addExpertise}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ajouter une compétence" />
                    </SelectTrigger>
                    <SelectContent>
                      {expertises?.filter(exp => !profileData.expertises.includes(exp.id)).map((expertise) => (
                        <SelectItem key={expertise.id} value={expertise.id}>
                          {expertise.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profileData.expertises.map((expId) => {
                      const expertise = expertises?.find(e => e.id === expId);
                      return (
                        <Badge key={expId} variant="secondary" className="flex items-center gap-1">
                          {expertise?.name}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => removeExpertise(expId)}
                          />
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Daily Rate */}
              <div>
                <Label>Tarif journalier (€)</Label>
                <Input
                  type="number"
                  value={profileData.dailyRate}
                  onChange={(e) => setProfileData(prev => ({ ...prev, dailyRate: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  step="10"
                />
                <div className="text-sm text-muted-foreground mt-1">
                  Tarif horaire: {calculateHourlyRate()}€ | Tarif minute: {calculateMinuteRate()}€
                </div>
              </div>

              <Button className="w-full" disabled={!profileData.categoryId}>
                Finaliser mon inscription
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Rejoindre notre équipe</CardTitle>
          <p className="text-muted-foreground">
            Inscrivez-vous ou connectez-vous pour accéder à votre espace candidat
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signup">S'inscrire</TabsTrigger>
              <TabsTrigger value="login">Se connecter</TabsTrigger>
            </TabsList>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prénom</Label>
                    <Input
                      required
                      value={signupData.firstName}
                      onChange={(e) => setSignupData(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Nom</Label>
                    <Input
                      required
                      value={signupData.lastName}
                      onChange={(e) => setSignupData(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    required
                    value={signupData.email}
                    onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    type="tel"
                    value={signupData.phone}
                    onChange={(e) => setSignupData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Mot de passe</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={signupData.password}
                      onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Création..." : "Créer mon compte"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    required
                    value={loginData.email}
                    onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Mot de passe</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Team;