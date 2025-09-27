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
    <Card className="w-80 bg-background border shadow-lg" aria-describedby="edge-details-description">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Les attendus</span>
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
        <div id="edge-details-description" className="sr-only">
          Détails de la connexion entre {sourceProfile.name} et {targetProfile.name}, montrant les inputs et outputs de chaque ressource.
        </div>
        
        {/* Relation principale */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-blue-600">{sourceProfile.name}</span>
            {' '}doit donner ses livrables à{' '}
            <span className="font-semibold text-purple-600">{targetProfile.name}</span>
          </p>
        </div>
        
        {/* Message principal sur les livrables */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
          <div className="flex items-start gap-2">
            <div className="text-amber-600 mt-0.5">💡</div>
            <div className="flex-1">
              <p className="text-sm text-amber-800">
                Les livrables attendus seront à définir par vous et les experts qui composent votre équipe. 
              </p>
              <p className="text-sm text-amber-700 mt-2 font-medium">
                Nous recommandons fortement de les définir dès le lancement du projet.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}