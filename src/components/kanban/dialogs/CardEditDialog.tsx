import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, FileText, X, Download, Trash2 } from 'lucide-react';
import { UploadedFile } from '@/utils/fileUpload';

interface CardEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: any;
  onCardChange: (card: any) => void;
  projectMembers: any[];
  uploadedFiles: File[];
  onUploadedFilesChange: (files: File[]) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  uploadProgress: { uploaded: number; total: number };
  readOnly?: boolean;
}

export function CardEditDialog({
  open,
  onOpenChange,
  card,
  onCardChange,
  projectMembers,
  uploadedFiles,
  onUploadedFilesChange,
  onSave,
  isSaving,
  uploadProgress,
  readOnly = false
}: CardEditDialogProps) {
  if (!card) return null;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    onUploadedFilesChange([...uploadedFiles, ...files]);
  };

  const removeUploadedFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    onUploadedFilesChange(newFiles);
  };

  const removeExistingFile = (fileIndex: number) => {
    const newFiles = card.files.filter((_: any, i: number) => i !== fileIndex);
    onCardChange({ ...card, files: newFiles });
  };

  const downloadFile = async (file: UploadedFile) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {readOnly ? 'Détails de la carte' : 'Modifier la carte'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={card.title || ''}
              onChange={(e) => onCardChange({ ...card, title: e.target.value })}
              disabled={readOnly}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={card.description || ''}
              onChange={(e) => onCardChange({ ...card, description: e.target.value })}
              rows={3}
              disabled={readOnly}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priorité</Label>
              <Select
                value={card.priority || 'medium'}
                onValueChange={(value) => onCardChange({ ...card, priority: value })}
                disabled={readOnly}
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
                value={card.dueDate || ''}
                onChange={(e) => onCardChange({ ...card, dueDate: e.target.value })}
                disabled={readOnly}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="assignedTo">Assigné à</Label>
            <Select
              value={Array.isArray(card.assignedTo) ? card.assignedTo[0] || '' : card.assignedTo || ''}
              onValueChange={(value) => onCardChange({ ...card, assignedTo: [value] })}
              disabled={readOnly}
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

          {/* Existing files */}
          {card.files && card.files.length > 0 && (
            <div>
              <Label>Fichiers existants</Label>
              <div className="space-y-2 mt-2">
                {card.files.map((file: UploadedFile, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">{file.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {(file.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadFile(file)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {!readOnly && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeExistingFile(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New file uploads */}
          {!readOnly && (
            <div>
              <Label htmlFor="files">Ajouter des fichiers</Label>
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
                        onClick={() => removeUploadedFile(index)}
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
          )}

          {card.isFinalized && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Cette carte est finalisée et ne peut plus être modifiée.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          {!readOnly && (
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
