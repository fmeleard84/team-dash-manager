import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ColumnCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnData: {
    title: string;
    color: string;
  };
  onColumnDataChange: (data: any) => void;
  onSave: () => void;
}

const colorOptions = [
  { value: '#3b82f6', label: 'Bleu', class: 'bg-blue-500' },
  { value: '#10b981', label: 'Vert', class: 'bg-green-500' },
  { value: '#f59e0b', label: 'Orange', class: 'bg-yellow-500' },
  { value: '#ef4444', label: 'Rouge', class: 'bg-red-500' },
  { value: '#8b5cf6', label: 'Violet', class: 'bg-purple-500' },
  { value: '#06b6d4', label: 'Cyan', class: 'bg-cyan-500' },
  { value: '#84cc16', label: 'Lime', class: 'bg-lime-500' },
  { value: '#f97316', label: 'Orange foncé', class: 'bg-orange-500' },
];

export function ColumnCreateDialog({
  open,
  onOpenChange,
  columnData,
  onColumnDataChange,
  onSave
}: ColumnCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle colonne</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={columnData.title}
              onChange={(e) => onColumnDataChange({ ...columnData, title: e.target.value })}
              placeholder="Nom de la colonne"
            />
          </div>

          <div>
            <Label>Couleur</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${color.class} ${
                    columnData.color === color.value 
                      ? 'border-foreground' 
                      : 'border-transparent hover:border-muted-foreground'
                  }`}
                  onClick={() => onColumnDataChange({ ...columnData, color: color.value })}
                  title={color.label}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSave} disabled={!columnData.title.trim()}>
            Créer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}