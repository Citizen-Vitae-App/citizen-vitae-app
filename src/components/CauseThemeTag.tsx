import { Badge } from '@/components/ui/badge';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';

interface CauseThemeTagProps {
  name: string;
  icon: string;
  color: string;
  selected: boolean;
  onClick: () => void;
}

export const CauseThemeTag = ({ name, icon, color, selected, onClick }: CauseThemeTagProps) => {
  const IconComponent = (Icons as any)[icon] || Icons.Heart;

  return (
    <Badge
      variant={selected ? "default" : "outline"}
      className={cn(
        "cursor-pointer px-4 py-2 text-sm flex items-center gap-2 transition-all",
        selected ? "ring-2 ring-offset-2" : "hover:bg-muted"
      )}
      style={selected ? { 
        backgroundColor: color, 
        borderColor: color,
        color: 'white'
      } : {}}
      onClick={onClick}
    >
      <IconComponent className="w-4 h-4" />
      {name}
    </Badge>
  );
};
