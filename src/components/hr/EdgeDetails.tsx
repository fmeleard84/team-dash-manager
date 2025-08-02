import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
interface HRProfile {
  id: string;
  name: string;
  inputs?: string[];
  outputs?: string[];
}

interface EdgeDetailsProps {
  sourceProfile: HRProfile | null;
  targetProfile: HRProfile | null;
  onClose: () => void;
}

export function EdgeDetails({ sourceProfile, targetProfile, onClose }: EdgeDetailsProps) {
  if (!sourceProfile || !targetProfile) {
    return null;
  }

  // Find matching inputs/outputs between the two profiles
  const connections = [];
  if (sourceProfile.outputs && targetProfile.inputs) {
    for (const output of sourceProfile.outputs) {
      for (const input of targetProfile.inputs) {
        if (output.toLowerCase().includes(input.toLowerCase()) || 
            input.toLowerCase().includes(output.toLowerCase()) ||
            (output.toLowerCase().includes('spécification') && input.toLowerCase().includes('spécification')) ||
            (output.toLowerCase().includes('planning') && input.toLowerCase().includes('planning')) ||
            (output.toLowerCase().includes('code') && input.toLowerCase().includes('code'))) {
          connections.push({ output, input });
        }
      }
    }
  }

  return (
    <Card className="w-80 bg-background border shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Connexion des livrables</span>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source Profile */}
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-2">
            📤 {sourceProfile.name} produit :
          </h4>
          <div className="flex flex-wrap gap-1">
            {sourceProfile.outputs?.map((output, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {output}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Target Profile */}
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-2">
            📥 {targetProfile.name} a besoin de :
          </h4>
          <div className="flex flex-wrap gap-1">
            {targetProfile.inputs?.map((input, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {input}
              </Badge>
            ))}
          </div>
        </div>

        {/* Matching connections */}
        {connections.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium text-sm text-primary mb-2">
                🔗 Connexions identifiées :
              </h4>
              <div className="space-y-2">
                {connections.map((connection, index) => (
                  <div key={index} className="text-xs bg-muted/50 p-2 rounded">
                    <span className="font-medium">{connection.output}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span>{connection.input}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {connections.length === 0 && (
          <>
            <Separator />
            <div className="text-sm text-muted-foreground text-center py-2">
              Aucune connexion directe identifiée automatiquement.
              <br />
              Cette collaboration peut nécessiter une coordination spécifique.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}