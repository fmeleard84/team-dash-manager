import { Paperclip } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CardFileAttachmentsProps {
  fileCount: number;
}

export const CardFileAttachments = ({ fileCount }: CardFileAttachmentsProps) => {
  if (fileCount === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <Paperclip className="w-3 h-3" />
      <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-auto">
        {fileCount} fichier{fileCount > 1 ? 's' : ''}
      </Badge>
    </div>
  );
};