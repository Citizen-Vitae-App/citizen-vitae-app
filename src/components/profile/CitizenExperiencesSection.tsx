import { BookOpen, ChevronRight, Calendar, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as Icons from 'lucide-react';
import type { CertifiedMission } from '@/hooks/useUserProfile';

interface CitizenExperiencesSectionProps {
  missions: CertifiedMission[];
  totalCount: number;
}

export function CitizenExperiencesSection({ missions, totalCount }: CitizenExperiencesSectionProps) {
  // Show max 5 recent missions
  const displayedMissions = missions.slice(0, 5);

  if (missions.length === 0) {
    return (
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          Expériences citoyennes
        </h2>
        <div className="bg-muted/50 rounded-xl p-6 text-center text-muted-foreground">
          <p>Vous n'avez pas encore de missions certifiées.</p>
          <p className="text-sm mt-1">Participez à des événements pour obtenir vos premières certifications.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          Expériences citoyennes
          <Badge variant="secondary" className="ml-2">
            {totalCount}
          </Badge>
        </h2>
      </div>

      {/* Timeline-style list */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-4">
          {displayedMissions.map((mission, index) => (
            <MissionCard key={mission.id} mission={mission} isFirst={index === 0} />
          ))}
        </div>
      </div>

      {/* View all button */}
      {totalCount > 5 && (
        <div className="mt-6 text-center">
          <Button variant="outline" asChild>
            <Link to="/my-missions" className="flex items-center gap-2">
              Voir toutes mes expériences
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}

interface MissionCardProps {
  mission: CertifiedMission;
  isFirst: boolean;
}

function MissionCard({ mission, isFirst }: MissionCardProps) {
  const formatDateRange = (startDateStr: string, endDateStr: string) => {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    // If same day, show only one date
    if (isSameDay(startDate, endDate)) {
      return format(startDate, 'd MMMM yyyy', { locale: fr });
    }
    
    // Otherwise show only start date (date of participation)
    return format(startDate, 'd MMMM yyyy', { locale: fr });
  };

  const getOrgInitials = () => {
    return mission.organization_name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="relative pl-14">
      {/* Timeline dot */}
      <div
        className={`absolute left-4 w-5 h-5 rounded-full border-2 ${
          isFirst
            ? 'bg-primary border-primary'
            : 'bg-background border-border'
        }`}
      />

      <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          {/* Organization logo */}
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={mission.organization_logo || undefined} alt={mission.organization_name} />
            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
              {getOrgInitials()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Mission name */}
            <h3 className="font-semibold text-foreground truncate">{mission.event_name}</h3>

            {/* Organization */}
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3" />
              {mission.organization_name}
            </p>

            {/* Date */}
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              {formatDateRange(mission.start_date, mission.end_date)}
            </p>

            {/* Causes */}
            {mission.causes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {mission.causes.map((cause) => {
                  const IconComponent = (Icons as any)[cause.icon] || Icons.Heart;
                  return (
                    <Badge
                      key={cause.id}
                      variant="outline"
                      className="text-xs px-2 py-0.5 flex items-center gap-1"
                      style={{ borderColor: cause.color, color: cause.color }}
                    >
                      <IconComponent className="h-3 w-3" />
                      {cause.name}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
