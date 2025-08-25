import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  File, 
  Image, 
  Video, 
  Music, 
  FileText, 
  Archive, 
  X,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  children: React.ReactNode;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
}

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

const getFileIcon = (file: File) => {
  const type = file.type.toLowerCase();
  
  if (type.startsWith('image/')) return <Image className="w-6 h-6 text-green-600" />;
  if (type.startsWith('video/')) return <Video className="w-6 h-6 text-blue-600" />;
  if (type.startsWith('audio/')) return <Music className="w-6 h-6 text-purple-600" />;
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) 
    return <FileText className="w-6 h-6 text-red-600" />;
  if (type.includes('zip') || type.includes('rar') || type.includes('archive')) 
    return <Archive className="w-6 h-6 text-orange-600" />;
  
  return <File className="w-6 h-6 text-gray-600" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const FileUploadZone = ({ 
  onFilesSelected, 
  children, 
  maxFiles = 10, 
  maxSize = 10 * 1024 * 1024, // 10MB default
  acceptedTypes = [
    'image/*',
    'video/*',
    'audio/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/*',
    'application/zip',
    'application/x-rar-compressed'
  ]
}: FileUploadZoneProps) => {
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [dragCounter, setDragCounter] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const reasons = rejectedFiles.map(({ errors }) => 
        errors.map((e: any) => e.message).join(', ')
      ).join('; ');
      
      toast({
        variant: "destructive",
        title: "Fichiers rejetés",
        description: reasons
      });
    }

    // Handle accepted files
    if (acceptedFiles.length > 0) {
      const filesWithPreview = acceptedFiles.map(file => {
        const fileWithId = Object.assign(file, {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
        });
        return fileWithId;
      });

      setSelectedFiles(prev => {
        const newFiles = [...prev, ...filesWithPreview];
        if (newFiles.length > maxFiles) {
          toast({
            variant: "destructive",
            title: "Trop de fichiers",
            description: `Maximum ${maxFiles} fichiers autorisés`
          });
          return prev;
        }
        return newFiles;
      });

      toast({
        title: "Fichiers sélectionnés",
        description: `${acceptedFiles.length} fichier(s) prêt(s) à envoyer`
      });
    }
  }, [maxFiles, toast]);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize,
    maxFiles,
    multiple: true,
    noClick: true,
    noKeyboard: true
  });

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const sendFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploadStatus('uploading');
    try {
      await onFilesSelected(selectedFiles);
      setUploadStatus('success');
      
      // Clean up previews
      selectedFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
      setSelectedFiles([]);
      
      setTimeout(() => setUploadStatus('idle'), 2000);
    } catch (error) {
      setUploadStatus('error');
      toast({
        variant: "destructive",
        title: "Erreur d'envoi",
        description: "Impossible d'envoyer les fichiers"
      });
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragActive(false);
      }
      return newCounter;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setDragCounter(0);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onDrop(files, []);
    }
  };

  return (
    <div className="relative">
      {/* Drag overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <Upload className="w-12 h-12 text-primary mx-auto mb-2" />
            <p className="text-lg font-medium text-primary">Déposez vos fichiers ici</p>
            <p className="text-sm text-muted-foreground">Maximum {maxFiles} fichiers, {formatFileSize(maxSize)} par fichier</p>
          </div>
        </div>
      )}

      <div
        {...getRootProps()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative"
      >
        <input {...getInputProps()} />
        
        {/* Selected files preview */}
        {selectedFiles.length > 0 && (
          <div className="mb-4 p-4 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Fichiers sélectionnés ({selectedFiles.length})</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={open}
                >
                  Ajouter
                </Button>
                <Button
                  onClick={sendFiles}
                  size="sm"
                  disabled={uploadStatus === 'uploading'}
                  className="min-w-[80px]"
                >
                  {uploadStatus === 'uploading' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  )}
                  {uploadStatus === 'success' && <Check className="w-4 h-4 mr-2" />}
                  {uploadStatus === 'error' && <AlertTriangle className="w-4 h-4 mr-2" />}
                  {uploadStatus === 'idle' && 'Envoyer'}
                  {uploadStatus === 'uploading' && 'Envoi...'}
                  {uploadStatus === 'success' && 'Envoyé'}
                  {uploadStatus === 'error' && 'Erreur'}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {selectedFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-2 bg-background rounded border">
                  {file.preview ? (
                    <img 
                      src={file.preview} 
                      alt={file.name}
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : (
                    getFileIcon(file)
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      <Badge variant="outline" className="text-xs">
                        {file.type.split('/')[0] || 'file'}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload progress */}
        {uploadStatus === 'uploading' && (
          <div className="mb-4">
            <Progress value={65} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">Envoi des fichiers...</p>
          </div>
        )}

        {/* Success/Error messages */}
        {uploadStatus === 'success' && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <Check className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Fichiers envoyés avec succès !
            </AlertDescription>
          </Alert>
        )}

        {uploadStatus === 'error' && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700">
              Erreur lors de l'envoi des fichiers. Veuillez réessayer.
            </AlertDescription>
          </Alert>
        )}

        {children}
      </div>
    </div>
  );
};