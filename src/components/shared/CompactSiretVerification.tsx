import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Check, Loader2, Building2, Info, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface CompactSiretVerificationProps {
  siret: string;
  companyName: string;
  onSiretChange: (siret: string) => void;
  onCompanyNameChange: (name: string) => void;
  onValidation?: (isValid: boolean, companyInfo?: CompanyInfo) => void;
  required?: boolean;
  className?: string;
}

export function CompactSiretVerification({
  siret,
  companyName,
  onSiretChange,
  onCompanyNameChange,
  onValidation,
  required = false,
  className = ''
}: CompactSiretVerificationProps) {
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isValidFormat, setIsValidFormat] = useState(false);

  // Vérifier le format du SIRET/SIREN en temps réel
  useEffect(() => {
    const cleanSiret = siret.replace(/\D/g, '');
    const isValid = (/^\d{9}$/.test(cleanSiret) || /^\d{14}$/.test(cleanSiret)) && luhnCheck(cleanSiret);
    setIsValidFormat(isValid);

    // Réinitialiser si le numéro change
    if (companyInfo && siret !== companyInfo.siretSiege && siret !== companyInfo.siren) {
      setCompanyInfo(null);
      setVerificationError('');
      onValidation?.(false);
    }
  }, [siret]);

  const handleVerifySiret = async () => {
    const cleanSiret = siret.replace(/\D/g, '');

    if (!isValidFormat) {
      setVerificationError('Numéro invalide');
      return;
    }

    setVerifying(true);
    setVerificationError('');
    setCompanyInfo(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-siret', {
        body: { siret: cleanSiret }
      });

      if (error) throw error;

      if (data.ok) {
        setCompanyInfo(data);

        if (!data.active) {
          setVerificationError('⚠️ Entreprise fermée');
          onValidation?.(false, data);
        } else {
          onValidation?.(true, data);
        }

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
      setVerificationError('Erreur de vérification');
      onValidation?.(false);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="siret" className="text-foreground">
          Numéro SIRET / SIREN
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="flex gap-2">
          <Input
            id="siret"
            value={siret}
            onChange={(e) => onSiretChange(e.target.value)}
            placeholder="123 456 789 00012"
            className="flex-1 bg-background border-border"
          />
          <Button
            onClick={handleVerifySiret}
            disabled={!isValidFormat || verifying}
            variant={isValidFormat ? "default" : "secondary"}
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

        {/* Affichage compact du résultat */}
        {companyInfo && (
          <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
            <div className="flex items-center gap-2 flex-1">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground truncate">
                {companyInfo.name}
              </span>
              {companyInfo.active ? (
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                  Active
                </span>
              ) : (
                <span className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
                  Fermée
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(true)}
              type="button"
            >
              <Info className="w-4 h-4" />
            </Button>
          </div>
        )}

        {verificationError && !companyInfo && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{verificationError}</AlertDescription>
          </Alert>
        )}
      </div>


      {/* Modal pour les détails */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {companyInfo?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">SIREN:</span>{' '}
              <span className="font-mono text-foreground">{formatSiret(companyInfo?.siren || '')}</span>
            </div>
            {companyInfo?.siretSiege && (
              <div>
                <span className="text-muted-foreground">SIRET (siège):</span>{' '}
                <span className="font-mono text-foreground">{formatSiret(companyInfo.siretSiege)}</span>
              </div>
            )}
            {companyInfo?.ape && (
              <div>
                <span className="text-muted-foreground">Code APE:</span>{' '}
                <span className="font-mono text-foreground">{companyInfo.ape}</span>
              </div>
            )}
            {companyInfo?.legalForm && (
              <div>
                <span className="text-muted-foreground">Forme juridique:</span>{' '}
                <span className="text-foreground">{companyInfo.legalForm}</span>
              </div>
            )}
            {companyInfo?.address && (
              <div>
                <span className="text-muted-foreground">Adresse:</span>{' '}
                <span className="text-foreground">{companyInfo.address}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Statut:</span>{' '}
              {companyInfo?.active ? (
                <span className="text-green-600 dark:text-green-400 font-medium">Active</span>
              ) : (
                <span className="text-red-600 dark:text-red-400 font-medium">Fermée</span>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}