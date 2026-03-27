import { useState } from 'react';
import { BookOpen, ChevronRight, Calendar, Building2, Pencil, Eye, EyeOff, Plus, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import czvIcon from '@/assets/icon-sigle-czv.svg';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Link } from 'react-router-dom';
import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as Icons from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { AddManualExperienceDialog, EXPERIENCE_TYPES } from './AddManualExperienceDialog';
import type { CertifiedMission } from '@/hooks/useUserProfile';

interface ManualExperience {
  id: string;
  title: string;
  experience_type: string;
  organization_name: string;
  start_month: number;
  start_year: number;
  end_month: number | null;
  end_year: number | null;
  is_current: boolean;
  location: string | null;
  location_type: string | null;
  description: string | null;
  created_at: string;
}

interface CitizenExperiencesSectionProps {
  missions: CertifiedMission[];
  totalCount: number;
}

const MONTHS_FR = ['', 'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function CitizenExperiencesSection({ missions, totalCount }: CitizenExperiencesSectionProps) {
  const { user } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    missions.forEach(m => { map[m.id] = m.is_public !== false; });
    return map;
  });

  const { data: manualExperiences = [] } = useQuery({
    queryKey: ['manual-experiences', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('manual_experiences' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('start_year', { ascending: false })
        .order('start_month', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ManualExperience[];
    },
    enabled: !!user?.id,
  });

  const displayedMissions = missions.slice(0, 5);
  const grandTotal = totalCount + manualExperiences.length;

  const handleToggleVisibility = async (missionId: string, isPublic: boolean) => {
    setVisibilityMap(prev => ({ ...prev, [missionId]: isPublic }));
    try {
      const { error } = await supabase
        .from('event_registrations')
        .update({ is_public: isPublic } as any)
        .eq('id', missionId);
      if (error) throw error;
    } catch {
      setVisibilityMap(prev => ({ ...prev, [missionId]: !isPublic }));
      toast.error('Erreur lors de la mise à jour de la visibilité');
    }
  };

  const isEmpty = missions.length === 0 && manualExperiences.length === 0;

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 whitespace-nowrap">
          <BookOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          Expériences citoyennes
          {grandTotal > 0 && (
            <Badge variant="secondary" className="ml-1">
              {grandTotal}
            </Badge>
          )}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAddDialogOpen(true)}
            className="h-8 w-8 flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {!isEmpty && (
            <Button
              variant={editMode ? "default" : "ghost"}
              size="icon"
              onClick={() => setEditMode(!editMode)}
              className="h-8 w-8 flex-shrink-0"
            >
              {editMode ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {isEmpty ? (
        <div className="bg-muted/50 rounded-xl p-6 text-center text-muted-foreground">
          <p>Vous n'avez pas encore d'expériences citoyennes.</p>
          <p className="text-sm mt-1">Participez à des événements ou ajoutez vos expériences manuellement.</p>
        </div>
      ) : (
        <>
          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-4">
              {/* Certified missions */}
              {displayedMissions.map((mission, index) => (
                <CertifiedMissionCard
                  key={mission.id}
                  mission={mission}
                  isFirst={index === 0 && manualExperiences.length === 0}
                  editMode={editMode}
                  isPublic={visibilityMap[mission.id] !== false}
                  onToggleVisibility={handleToggleVisibility}
                />
              ))}
              {/* Manual experiences */}
              {manualExperiences.map((exp, index) => (
                <ManualExperienceCard
                  key={exp.id}
                  experience={exp}
                  isFirst={index === 0 && displayedMissions.length === 0}
                />
              ))}
            </div>
          </div>

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
        </>
      )}

      <AddManualExperienceDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </section>
  );
}

/* ─── Certified Mission Card ─── */

interface CertifiedMissionCardProps {
  mission: CertifiedMission;
  isFirst: boolean;
  editMode: boolean;
  isPublic: boolean;
  onToggleVisibility: (id: string, isPublic: boolean) => void;
}

function CertifiedMissionCard({ mission, isFirst, editMode, isPublic, onToggleVisibility }: CertifiedMissionCardProps) {
  const formatDateRange = (startDateStr: string, endDateStr: string) => {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    if (isSameDay(startDate, endDate)) {
      return format(startDate, 'd MMMM yyyy', { locale: fr });
    }
    return format(startDate, 'd MMMM yyyy', { locale: fr });
  };

  const getOrgInitials = () =>
    mission.organization_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={`relative pl-14 transition-opacity ${!isPublic ? 'opacity-50' : ''}`}>
      <div
        className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 ${
          isFirst ? 'bg-primary border-primary' : 'bg-background border-border'
        }`}
      />
      <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow relative">
        {/* Certified badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1">
          {!isPublic && !editMode && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
              <EyeOff className="h-3.5 w-3.5" />
              Masqué
            </span>
          )}
          <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
            <BadgeCheck className="h-3 w-3" />
            Certifié
          </Badge>
        </div>

        {editMode && (
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {isPublic ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {isPublic ? 'Visible sur le CV' : 'Masqué du CV'}
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={(checked) => onToggleVisibility(mission.id, checked)}
              className="scale-90"
            />
          </div>
        )}

        <div className="flex items-start gap-4">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={mission.organization_logo || undefined} alt={mission.organization_name} />
            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
              {getOrgInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate pr-20">{mission.event_name}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3" />
              {mission.organization_name}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              {formatDateRange(mission.start_date, mission.end_date)}
            </p>
            {mission.causes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {mission.causes.map(cause => {
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

/* ─── Manual Experience Card ─── */

function ManualExperienceCard({ experience, isFirst }: { experience: ManualExperience; isFirst: boolean }) {
  const getOrgInitials = () =>
    experience.organization_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const typeLabel = EXPERIENCE_TYPES.find(t => t.value === experience.experience_type)?.label || experience.experience_type;

  const formatPeriod = () => {
    const start = `${MONTHS_FR[experience.start_month]} ${experience.start_year}`;
    if (experience.is_current) return `${start} — Présent`;
    if (experience.end_month && experience.end_year) {
      return `${start} — ${MONTHS_FR[experience.end_month]} ${experience.end_year}`;
    }
    return start;
  };

  return (
    <div className="relative pl-14">
      <div
        className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 ${
          isFirst ? 'bg-primary border-primary' : 'bg-background border-border'
        }`}
      />
      <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow relative">
        {/* Déclaratif badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground">
            Déclaratif
          </Badge>
        </div>

        <div className="flex items-start gap-4">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
              {getOrgInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate pr-20">{experience.title}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3" />
              {experience.organization_name}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatPeriod()}
              </p>
              {experience.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {experience.location}
                </p>
              )}
            </div>
            <Badge variant="secondary" className="text-xs mt-2">
              {typeLabel}
            </Badge>
            {experience.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{experience.description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
