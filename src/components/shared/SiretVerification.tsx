import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Check, Loader2, Copy, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

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

interface SiretVerificationProps {
  siret: string;
  companyName: string;
  onSiretChange: (siret: string) => void;
  onCompanyNameChange: (name: string) => void;
  onValidation?: (isValid: boolean, companyInfo?: CompanyInfo) => void;
  required?: boolean;
  className?: string;
}

export function SiretVerification({
  siret,
  companyName,
  onSiretChange,
  onCompanyNameChange,
  onValidation,
  required = false,
  className = ''
}: SiretVerificationProps) {
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  const handleVerifySiret = async () => {
    const cleanSiret = siret.replace(/\D/g, '');

    // Validation locale
    if (!/^\d{9}$|^\d{14}$/.test(cleanSiret)) {
      setVerificationError('Le numéro doit contenir 9 chiffres (SIREN) ou 14 chiffres (SIRET)');
      onValidation?.(false);
      return;
    }

    if (!luhnCheck(cleanSiret)) {
      setVerificationError('Le numéro SIRET/SIREN est invalide (checksum incorrect)');
      onValidation?.(false);
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
          setVerificationError('⚠️ Cette entreprise est fermée administrativement');
          onValidation?.(false, data);
        } else {
          onValidation?.(true, data);
        }

        // Mettre à jour le nom de l'entreprise si trouvé
        if (data.name && !companyName) {
          onCompanyNameChange(data.name);
        }

        toast({
          title: "Entreprise vérifiée",
          description: `${data.name} - ${data.active ? 'Active' : 'Fermée'}`,
        });
      } else {
        setVerificationError(
          data.error === 'NOT_FOUND' ? 'Entreprise non trouvée' :
          data.error === 'NUM_INVALID' ? 'Numéro invalide' :
          'Erreur lors de la vérification'
        );
        onValidation?.(false);
      }
    } catch (error) {
      console.error('Error verifying SIRET:', error);
      setVerificationError('Erreur lors de la vérification. Veuillez réessayer.');
      onValidation?.(false);
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
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="siret">
          Numéro SIRET / SIREN
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <div className="flex gap-2">
          <Input
            id="siret"
            value={siret}
            onChange={(e) => onSiretChange(e.target.value)}
            placeholder="123 456 789 00012"
            className="flex-1 bg-background"
          />
          <Button
            onClick={handleVerifySiret}
            disabled={!siret || verifying}
            variant="outline"
            type="button"
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

        {companyInfo && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{companyInfo.name}</span>
                  {companyInfo.active ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Active</span>
                  ) : (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Fermée</span>
                  )}
                </div>
                <Button
                  onClick={copyCompanyInfo}
                  variant="ghost"
                  size="sm"
                  type="button"
                >
                  <Copy className="w-4 h-4" />
                </Button>
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
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyName">
          Nom de l'entreprise
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          id="companyName"
          value={companyName}
          onChange={(e) => onCompanyNameChange(e.target.value)}
          placeholder="Ex: Mon Entreprise SARL"
          className="bg-background"
        />
      </div>
    </div>
  );
}