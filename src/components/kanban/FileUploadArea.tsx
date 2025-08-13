import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Upload, X, Download, FileText, Image, File } from 'lucide-react';
import { KanbanFile } from '@/hooks/useKanbanFiles';

interface FileUploadAreaProps {
  files: KanbanFile[];
  uploading: boolean;
  onFileUpload: (files: File[]) => void;
  onFileDelete: (fileName: string) => void;
  onFileDownload: (fileName: string) => void;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
  if (type.includes('pdf') || type.includes('document')) return <FileText className="w-4 h-4" />;
  return <File className="w-4 h-4" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const FileUploadArea = ({
  files,
  uploading,
  onFileUpload,
  onFileDelete,
  onFileDownload
}: FileUploadAreaProps) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFileUpload(acceptedFiles);
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB limit
  });

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600">
          {isDragActive
            ? 'Déposez les fichiers ici...'
            : 'Glissez-déposez des fichiers ici, ou cliquez pour sélectionner'
          }
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Taille maximale: 10MB par fichier
        </p>
        {uploading && (
          <div className="mt-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-blue-600 mt-1">Téléchargement en cours...</p>
          </div>
        )}
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Fichiers joints ({files.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFileDownload(file.name)}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFileDelete(file.name)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};