import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Login form
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  
  // Register form
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    companyName: '',
    role: 'candidate' as 'client' | 'candidate'
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(loginForm.email, loginForm.password);
      if (success) {
        // Redirect based on user role will be handled by the router
        navigate('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      setIsLoading(false);
      return;
    }

    if (registerForm.password.length < 6) {
      toast.error('Le mot de passe doit faire au moins 6 caractères');
      setIsLoading(false);
      return;
    }

    try {
      const success = await register({
        email: registerForm.email,
        password: registerForm.password,
        firstName: registerForm.firstName,
        lastName: registerForm.lastName,
        phone: registerForm.phone || undefined,
        companyName: registerForm.companyName || undefined,
        role: registerForm.role
      });

      if (success) {
        // Tentative d'auto-connexion puis redirection
        const loggedIn = await login(registerForm.email, registerForm.password);
        if (loggedIn) {
          navigate('/dashboard');
          return;
        }
        // Si l'auto-connexion échoue (email à confirmer), on préremplit l'email
        setLoginForm(prev => ({ ...prev, email: registerForm.email }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Plateforme de gestion</CardTitle>
          <CardDescription>
            Connectez-vous ou créez un compte pour continuer
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="register">Inscription</TabsTrigger>
            </TabsList>
            
            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Se connecter
                </Button>
              </form>
              
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <p>Comptes de demo :</p>
                <p className="text-xs mt-2">
                  <strong>Admin:</strong> admin@example.com<br />
                  <strong>Client:</strong> client@example.com<br />
                  <strong>Candidat:</strong> candidate@example.com<br />
                  <em>Mot de passe: password</em>
                </p>
              </div>
            </TabsContent>
            
            {/* Register Tab */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      placeholder="Jean"
                      value={registerForm.firstName}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      placeholder="Dupont"
                      value={registerForm.lastName}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone (optionnel)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+33 1 23 45 67 89"
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Je suis</Label>
                  <Select 
                    value={registerForm.role} 
                    onValueChange={(value: 'client' | 'candidate') => 
                      setRegisterForm(prev => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="candidate">Un candidat/freelance</SelectItem>
                      <SelectItem value="client">Un client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {registerForm.role === 'client' && (
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nom de l'entreprise (optionnel)</Label>
                    <Input
                      id="companyName"
                      placeholder="Ma Société SARL"
                      value={registerForm.companyName}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, companyName: e.target.value }))}
                      disabled={isLoading}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="register-password">Mot de passe</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    disabled={isLoading}
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Créer mon compte
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;