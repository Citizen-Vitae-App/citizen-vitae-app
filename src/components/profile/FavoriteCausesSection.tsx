import { Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import * as Icons from 'lucide-react';
import type { UserCauseTheme } from '@/hooks/useUserProfile';

interface FavoriteCausesSectionProps {
  causes: UserCauseTheme[];
}

export function FavoriteCausesSection({ causes }: FavoriteCausesSectionProps) {
  if (causes.length === 0) {
    return null;
  }

  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Heart className="h-5 w-5 text-muted-foreground" />
        Mes causes favorites
      </h2>
      <div className="flex flex-wrap gap-2">
        {causes.map((cause) => {
          const IconComponent = (Icons as any)[cause.icon] || Icons.Heart;
          return (
            <Badge
              key={cause.id}
              className="px-3 py-1.5 text-sm flex items-center gap-2"
              style={{
                backgroundColor: cause.color,
                borderColor: cause.color,
                color: 'white',
              }}
            >
              <IconComponent className="h-4 w-4" />
              {cause.name}
            </Badge>
          );
        })}
      </div>
    </section>
  );
}
