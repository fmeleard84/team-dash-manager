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
      <span className="text-xs">{fileCount}</span>
    </div>
  );
};