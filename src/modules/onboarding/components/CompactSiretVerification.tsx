/**
 * Module ONBOARDING - Composant CompactSiretVerification
 *
 * Composant temporaire pour la vérification du SIRET
 * dans le processus d'onboarding.
 */

import { useState } from 'react';
import { Input } from "@/ui/components/input";
import { Button } from "@/ui/components/button";
import { Label } from "@/ui/components/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/card";
import { Badge } from "@/ui/components/badge";
import { CheckCircle, AlertCircle, Loader2, Building } from 'lucide-react';

interface CompactSiretVerificationProps {
  siret?: string;
  onSiretChange?: (siret: string) => void;
  companyName?: string;
  onCompanyNameChange?: (name: string) => void;
  onVerificationComplete?: (data: { siret: string; companyName: string; isValid: boolean }) => void;
}

export function CompactSiretVerification({
  siret = '',
  onSiretChange,
  companyName = '',
  onCompanyNameChange,
  onVerificationComplete
}: CompactSiretVerificationProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [error, setError] = useState<string>('');

  const handleSiretChange = (value: string) => {
    // Format SIRET (remove non-digits and limit to 14 chars)
    const formattedSiret = value.replace(/\D/g, '').slice(0, 14);
    onSiretChange?.(formattedSiret);

    if (verificationStatus !== 'idle') {
      setVerificationStatus('idle');
      setError('');
    }
  };

  const validateSiret = async () => {
    if (!siret || siret.length !== 14) {
      setError('Le SIRET doit contenir exactement 14 chiffres');
      setVerificationStatus('invalid');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      // Simulation de vérification (remplacer par vraie API)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Pour la démo, on considère valide si le SIRET fait 14 chiffres
      const isValid = siret.length === 14;

      if (isValid) {
        setVerificationStatus('valid');
        // Si pas de nom d'entreprise fourni, en générer un fictif
        const finalCompanyName = companyName || `Entreprise ${siret.slice(0, 3)}***`;
        onCompanyNameChange?.(finalCompanyName);
        onVerificationComplete?.({
          siret,
          companyName: finalCompanyName,
          isValid: true
        });
      } else {
        setVerificationStatus('invalid');
        setError('SIRET invalide ou entreprise non trouvée');
      }
    } catch (err) {
      setError('Erreur lors de la vérification');
      setVerificationStatus('invalid');
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'valid':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Building className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (verificationStatus) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Vérifié</Badge>;
      case 'invalid':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Invalide</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getStatusIcon()}
          Vérification SIRET
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="siret">Numéro SIRET *</Label>
          <div className="flex gap-2">
            <Input
              id="siret"
              value={siret}
              onChange={(e) => handleSiretChange(e.target.value)}
              placeholder="12345678901234"
              maxLength={14}
              className="flex-1"
            />
            <Button
              onClick={validateSiret}
              disabled={isVerifying || siret.length !== 14}
              className="min-w-[100px]"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Vérification...
                </>
              ) : (
                'Vérifier'
              )}
            </Button>
          </div>
          {siret.length > 0 && siret.length !== 14 && (
            <p className="text-sm text-amber-600">
              {siret.length}/14 chiffres
            </p>
          )}
        </div>

        {verificationStatus === 'valid' && (
          <div className="space-y-2">
            <Label htmlFor="companyName">Nom de l'entreprise</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => onCompanyNameChange?.(e.target.value)}
              placeholder="Nom de votre entreprise"
            />
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-md border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {verificationStatus === 'valid' && (
          <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950 p-3 rounded-md border border-green-200 dark:border-green-800">
            ✓ SIRET vérifié avec succès
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CompactSiretVerification;