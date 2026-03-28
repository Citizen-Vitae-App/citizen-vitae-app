import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Heart, ClipboardList, Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: 'calendar' | 'heart' | 'clipboard' | 'search' | 'map';
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaLink?: string;
  onCtaClick?: () => void;
  children?: ReactNode;
}

const iconMap = {
  calendar: Calendar,
  heart: Heart,
  clipboard: ClipboardList,
  search: Search,
  map: MapPin,
};

export function EmptyState({
  icon = 'calendar',
  title,
  description,
  ctaLabel,
  ctaLink,
  onCtaClick,
  children,
}: EmptyStateProps) {
  const Icon = iconMap[icon];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-5">
        <Icon className="h-9 w-9 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
      {description && (
        <p className="text-muted-foreground text-sm max-w-sm mb-6">{description}</p>
      )}
      {ctaLabel && ctaLink && (
        <Link to={ctaLink}>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            {ctaLabel}
          </Button>
        </Link>
      )}
      {ctaLabel && onCtaClick && !ctaLink && (
        <Button onClick={onCtaClick} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {ctaLabel}
        </Button>
      )}
      {children}
    </div>
  );
}
