import { SelectItem } from '@/components/ui/select';

interface ProjectSelectItemProps {
  value: string;
  title: string;
  date: string;
  children?: React.ReactNode;
}

export const ProjectSelectItem = ({ value, title, date }: ProjectSelectItemProps) => {
  return (
    <SelectItem key={value} value={value}>
      <div className="flex items-center justify-between w-full">
        <span className="font-medium">{title}</span>
        <span className="text-xs text-muted-foreground ml-2">• {date}</span>
      </div>
    </SelectItem>
  );
};