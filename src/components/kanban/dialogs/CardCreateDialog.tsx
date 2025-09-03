import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, X } from 'lucide-react';

interface CardCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardData: {
    title: string;
    description: string;
    columnId: string;
    dueDate: string;
    priority: string;
    assignedTo: any[];
  };
  onCardDataChange: (data: any) => void;
  projectMembers: any[];
  uploadedFiles: File[];
  onUploadedFilesChange: (files: File[]) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  uploadProgress: { uploaded: number; total: number };
}

export function CardCreateDialog({
  open,
  onOpenChange,
  cardData,
  onCardDataChange,
  projectMembers,
  uploadedFiles,
  onUploadedFilesChange,
  onSave,
  isSaving,
  uploadProgress
}: CardCreateDialogProps) {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    onUploadedFilesChange([...uploadedFiles, ...files]);
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    onUploadedFilesChange(newFiles);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle carte</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={cardData.title}
              onChange={(e) => onCardDataChange({ ...cardData, title: e.target.value })}
              placeholder="Titre de la carte"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={cardData.description}
              onChange={(e) => onCardDataChange({ ...cardData, description: e.target.value })}
              placeholder="Description de la carte"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priorité</Label>
              <Select
                value={cardData.priority}
                onValueChange={(value) => onCardDataChange({ ...cardData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Élevée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dueDate">Date d'échéance</Label>
              <Input
                id="dueDate"
                type="date"
                value={cardData.dueDate}
                onChange={(e) => onCardDataChange({ ...cardData, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="assignedTo">Assigné à</Label>
            <Select
              value={cardData.assignedTo[0] || ''}
              onValueChange={(value) => onCardDataChange({ ...cardData, assignedTo: [value] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un membre" />
              </SelectTrigger>
              <SelectContent>
                {projectMembers.map((member) => (
                  <SelectItem key={member.email} value={member.email}>
                    {member.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="files">Fichiers</Label>
            <Input
              id="files"
              type="file"
              multiple
              onChange={handleFileUpload}
              className="mt-1"
            />
            
            {uploadedFiles.length > 0 && (
              <div className="space-y-2 mt-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">{file.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {(file.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {uploadProgress.total > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>Upload en cours...</span>
                  <span>{uploadProgress.uploaded}/{uploadProgress.total}</span>
                </div>
                <Progress value={(uploadProgress.uploaded / uploadProgress.total) * 100} />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSave} disabled={isSaving || !cardData.title.trim()}>
            {isSaving ? 'Création...' : 'Créer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}