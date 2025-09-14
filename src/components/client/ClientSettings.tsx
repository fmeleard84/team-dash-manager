import { useState, useEffect } from 'react';
import { 
  Settings, 
  LogOut, 
  Save, 
  Check, 
  AlertCircle,
  Building2,
  Loader2,
  Copy,
  ExternalLink,
  CreditCard
} from 'lucide-react';
import { PageHeader } from '@/ui/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/ui/components/Card';
import { CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/ui/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentHistory } from './PaymentHistory';

// Validation Luhn pour SIRET/SIREN
function luhnCheck(num: string): boolean {
  let sum = 0;
  let alternate = false;
  
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  
  return sum % 10 === 0;
}

// Formater SIRET pour l'affichage
function formatSiret(siret: string): string {
  const clean = siret.replace(/\D/g, '');
  if (clean.length === 14) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)} ${clean.slice(9, 14)}`;
  }
  if (clean.length === 9) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)}`;
  }
  return clean;
}

interface CompanyInfo {
  active: boolean;
  name: string;
  siren: string;
  siretSiege?: string;
  ape?: string;
  address?: string;
  legalForm?: string;
}

interface ClientSettingsProps {
  defaultTab?: 'profile' | 'payments';
}

export function ClientSettings({ defaultTab = 'profile' }: ClientSettingsProps = {}) {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [verificationError, setVerificationError] = useState<string>('');

  // États pour l'édition
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [companyName, setCompanyName] = useState(user?.companyName || '');
  const [siret, setSiret] = useState(user?.siret || '');

  useEffect(() => {
    // Charger les infos depuis le profil client
    const loadProfile = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setPhone(data.phone || '');
        setCompanyName(data.company_name || '');
        setSiret(data.siret || '');
      }
    };
    
    loadProfile();
  }, [user?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Vérifier d'abord si le profil existe
      const { data: existingProfile } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('id', user?.id)
        .single();

      if (existingProfile) {
        // Le profil existe, faire un update
        const updateData: any = {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          company_name: companyName,
          updated_at: new Date().toISOString()
        };
        
        // Ajouter siret maintenant que la colonne existe
        updateData.siret = siret.replace(/\D/g, '');
        
        const { error } = await supabase
          .from('client_profiles')
          .update(updateData)
          .eq('id', user?.id);

        if (error) throw error;
      } else {
        // Le profil n'existe pas, faire un insert
        const insertData: any = {
          id: user?.id,
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          company_name: companyName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Ajouter siret maintenant que la colonne existe
        insertData.siret = siret.replace(/\D/g, '');
        
        const { error } = await supabase
          .from('client_profiles')
          .insert(insertData);

        if (error) throw error;
      }

      // Faire la même chose pour profiles
      const { data: existingBaseProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user?.id)
        .single();

      if (existingBaseProfile) {
        await supabase
          .from('profiles')
          .update({
            first_name: firstName,
            last_name: lastName,
            updated_at: new Date().toISOString()
          })
          .eq('id', user?.id);
      } else {
        await supabase
          .from('profiles')
          .insert({
            id: user?.id,
            first_name: firstName,
            last_name: lastName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      toast({
        title: "Informations mises à jour",
        description: "Vos informations ont été enregistrées avec succès",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder vos informations",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVerifySiret = async () => {
    const cleanSiret = siret.replace(/\D/g, '');
    
    // Validation locale
    if (!/^\d{9}$|^\d{14}$/.test(cleanSiret)) {
      setVerificationError('Le numéro doit contenir 9 chiffres (SIREN) ou 14 chiffres (SIRET)');
      return;
    }
    
    if (!luhnCheck(cleanSiret)) {
      setVerificationError('Le numéro SIRET/SIREN est invalide (checksum incorrect)');
      return;
    }

    setVerifying(true);
    setVerificationError('');
    setCompanyInfo(null);

    try {
      // Appeler l'edge function Supabase pour vérifier le SIRET
      const { data, error } = await supabase.functions.invoke('verify-siret', {
        body: { siret: cleanSiret }
      });

      if (error) throw error;

      if (data.ok) {
        setCompanyInfo(data);
        
        // Si entreprise fermée, avertir
        if (!data.active) {
          setVerificationError('⚠️ Cette Company est fermée administrativement');
        }
        
        // Mettre à jour le nom de l'entreprise si trouvé
        if (data.name && !companyName) {
          setCompanyName(data.name);
        }
      } else {
        setVerificationError(
          data.error === 'NOT_FOUND' ? 'Entreprise introuvable' :
          data.error === 'NUM_INVALID' ? 'Numéro invalide' :
          'Erreur lors de la vérification'
        );
      }
    } catch (error) {
      console.error('Error verifying SIRET:', error);
      setVerificationError('Erreur lors de la vérification. Veuillez réessayer.');
    } finally {
      setVerifying(false);
    }
  };

  const copyCompanyInfo = () => {
    if (!companyInfo) return;
    
    const text = `${companyInfo.name}
SIREN: ${companyInfo.siren}
${companyInfo.siretSiege ? `SIRET: ${formatSiret(companyInfo.siretSiege)}` : ''}
${companyInfo.ape ? `Code APE: ${companyInfo.ape}` : ''}
${companyInfo.address || ''}`;
    
    navigator.clipboard.writeText(text);
    toast({
      title: "Informations copiées",
      description: "Les informations de l'entreprise ont été copiées",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Settings}
        title="Paramètres"
        subtitle="Gérez vos informations personnelles et de l'entreprise"
      />
      
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">
            <Settings className="w-4 h-4 mr-2" />
            Profil & Entreprise
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="w-4 h-4 mr-2" />
            Mes paiements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Informations personnelles */}
          <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
          <CardDescription>Modifiez vos Informations de contact</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Votre prénom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Votre nom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+33 6 12 34 56 78"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations entreprise */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de l'entreprise</CardTitle>
          <CardDescription>Gérez les Informations de votre société</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Nom de l'entreprise</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nom de votre entreprise"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="siret">Numéro SIRET / SIREN</Label>
            <div className="flex gap-2">
              <Input
                id="siret"
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
                placeholder="123 456 789 00012"
                className="flex-1"
              />
              <Button
                onClick={handleVerifySiret}
                disabled={!siret || verifying}
                variant="outline"
              >
                {verifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Vérifier
              </Button>
            </div>
            {verificationError && (
              <Alert variant={verificationError.includes('⚠️') ? 'default' : 'destructive'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{verificationError}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Affichage des infos entreprise vérifiées */}
          {companyInfo && (
            <div className="p-4 bg-card rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-brand" />
                  <span className="font-semibold">{companyInfo.name}</span>
                  <Badge variant={companyInfo.active ? 'default' : 'destructive'}>
                    {companyInfo.active ? 'Active' : 'Fermée'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyCompanyInfo}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                  >
                    <a
                      href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${companyInfo.siren}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">SIREN:</span>{' '}
                  <span className="font-mono">{formatSiret(companyInfo.siren)}</span>
                </div>
                {companyInfo.siretSiege && (
                  <div>
                    <span className="text-muted-foreground">SIRET (siège):</span>{' '}
                    <span className="font-mono">{formatSiret(companyInfo.siretSiege)}</span>
                  </div>
                )}
                {companyInfo.ape && (
                  <div>
                    <span className="text-muted-foreground">Code APE:</span>{' '}
                    <span className="font-mono">{companyInfo.ape}</span>
                  </div>
                )}
                {companyInfo.address && (
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">Adresse:</span>{' '}
                    <span>{companyInfo.address}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer les modifications
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Préférences d'affichage */}
      <Card>
        <CardHeader>
          <CardTitle>Préférences d'affichage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Thème de l'application</p>
              <p className="text-sm text-muted-foreground">Choisissez entre le mode clair et sombre</p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* Zone dangereuse */}
      <Card>
        <CardHeader>
          <CardTitle>Compte</CardTitle>
          <CardDescription>Gérez votre compte et vos données</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <div>
              <p className="font-medium text-destructive">Zone dangereuse</p>
              <p className="text-sm text-muted-foreground">Déconnectez-vous de votre compte</p>
            </div>
            <Button variant="destructive" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="payments">
          <PaymentHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}