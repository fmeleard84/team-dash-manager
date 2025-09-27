import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Paperclip, 
  Upload, 
  X, 
  FileText, 
  Download,
  Eye,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { KanbanAttachment } from '@/types/kanban';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface FileUploadProps {
  cardId: string;
  attachments: KanbanAttachment[];
  onAttachmentsUpdate: (attachments: KanbanAttachment[]) => void;
}

export const FileUpload = ({ cardId, attachments, onAttachmentsUpdate }: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [showFileDialog, setShowFileDialog] = useState(false);

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${cardId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('kanban-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('kanban-files')
        .getPublicUrl(fileName);

      // Create attachment object
      const newAttachment: KanbanAttachment = {
        id: uploadData.path,
        cardId,
        fileName: file.name,
        fileUrl: urlData.publicUrl,
        fileSize: file.size,
        fileType: file.type,
        uploadedBy: 'user', // TODO: get real user ID
        uploadedAt: new Date().toISOString()
      };

      // Update attachments
      const updatedAttachments = [...attachments, newAttachment];
      onAttachmentsUpdate(updatedAttachments);
      
      toast({ title: "Fichier uploadé avec succès" });
      
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({ 
        title: "Erreur lors de l'upload",
        description: "Le fichier n'a pas pu être uploadé",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (attachment: KanbanAttachment) => {
    try {
      // Delete from storage
      const { error } = await supabase.storage
        .from('kanban-files')
        .remove([attachment.id]);

      if (error) throw error;

      // Update attachments
      const updatedAttachments = attachments.filter(att => att.id !== attachment.id);
      onAttachmentsUpdate(updatedAttachments);
      
      toast({ title: "Fichier supprimé" });
      
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({ 
        title: "Erreur lors de la suppression",
        variant: "destructive"
      });
    }
  };

  const downloadFile = async (attachment: KanbanAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('kanban-files')
        .download(attachment.id);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({ 
        title: "Erreur lors du téléchargement",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div>
      {/* File Upload Section */}
      <div className="space-y-2">
        <Label>Fichiers joints</Label>
        
        {/* Upload Button */}
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              asChild
            >
              <span className="flex items-center gap-2">
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? 'Upload...' : 'Ajouter un fichier'}
              </span>
            </Button>
            <Input
              type="file"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach(uploadFile);
                e.target.value = ''; // Reset input
              }}
              className="hidden"
              accept="*/*"
            />
          </label>

          {/* View Files Button */}
          {attachments.length > 0 && (
            <Dialog open={showFileDialog} onOpenChange={setShowFileDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4 mr-1" />
                  Voir fichiers ({attachments.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Fichiers joints</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {attachments.map((attachment) => (
                    <div 
                      key={attachment.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{attachment.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.fileSize)} • {new Date(attachment.uploadedAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadFile(attachment)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteFile(attachment)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Quick file list preview */}
        {attachments.length > 0 && (
          <div className="space-y-1">
            {attachments.slice(0, 3).map((attachment) => (
              <div key={attachment.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Paperclip className="w-3 h-3" />
                <span className="truncate">{attachment.fileName}</span>
                <span>({formatFileSize(attachment.fileSize)})</span>
              </div>
            ))}
            {attachments.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{attachments.length - 3} autres fichiers
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};