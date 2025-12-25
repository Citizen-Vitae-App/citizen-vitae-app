import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShieldCheck, Calendar, MapPin, Ticket } from 'lucide-react';

interface ContributorProfilePanelProps {
  userId: string | null;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContributorProfilePanel({ 
  userId, 
  organizationId, 
  open, 
  onOpenChange 
}: ContributorProfilePanelProps) {
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['contributor-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && open,
  });

  const { data: missions, isLoading: missionsLoading } = useQuery({
    queryKey: ['contributor-missions', userId, organizationId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          id,
          status,
          registered_at,
          attended_at,
          certificate_id,
          events!inner(
            id,
            name,
            start_date,
            end_date,
            location,
            organization_id
          )
        `)
        .eq('user_id', userId)
        .eq('events.organization_id', organizationId)
        .order('registered_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && !!organizationId && open,
  });

  const { data: causeThemes } = useQuery({
    queryKey: ['contributor-causes', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_cause_themes')
        .select(`
          cause_theme_id,
          cause_themes(id, name, icon, color)
        `)
        .eq('user_id', userId);
      if (error) throw error;
      return data?.map(item => item.cause_themes).filter(Boolean) || [];
    },
    enabled: !!userId && open,
  });

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Inscrit</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Approuvé</Badge>;
      case 'attended':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">Présent</Badge>;
      case 'waitlist':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Liste d'attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const certifiedMissions = missions?.filter(m => m.attended_at !== null).length || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Profil du contributeur</SheetTitle>
        </SheetHeader>

        {profileLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Header du profil */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-lg">
                  {getInitials(profile.first_name, profile.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">
                  {profile.first_name && profile.last_name 
                    ? `${profile.first_name} ${profile.last_name}` 
                    : 'Nom non renseigné'}
                </h2>
                <p className="text-muted-foreground">{profile.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  {profile.id_verified ? (
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Identité vérifiée
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Identité non vérifiée
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground">Bio</h3>
                <p className="text-sm">{profile.bio}</p>
              </div>
            )}

            {/* Causes favorites */}
            {causeThemes && causeThemes.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground">Causes favorites</h3>
                <div className="flex flex-wrap gap-2">
                  {causeThemes.map((cause: any) => (
                    <Badge 
                      key={cause.id}
                      variant="outline"
                      className="px-3 py-1 text-sm flex items-center gap-2"
                      style={{ borderColor: cause.color, color: cause.color }}
                    >
                      {cause.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Stats rapides */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border bg-muted/30">
                <div className="text-2xl font-bold">{missions?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Missions totales</div>
              </div>
              <div className="p-4 rounded-xl border bg-muted/30">
                <div className="text-2xl font-bold">{certifiedMissions}</div>
                <div className="text-sm text-muted-foreground">Participations certifiées</div>
              </div>
            </div>

            {/* Historique des missions */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">
                Historique des missions ({missions?.length || 0})
              </h3>
              {missionsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : missions && missions.length > 0 ? (
                <div className="space-y-2">
                  {missions.map((mission: any) => (
                    <div 
                      key={mission.id} 
                      className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm truncate">{mission.events.name}</h4>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(mission.events.start_date), 'dd MMM yyyy', { locale: fr })}
                            </span>
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{mission.events.location}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(mission.status)}
                          {mission.certificate_id && (
                            <Badge variant="outline" className="text-xs">
                              <Ticket className="h-3 w-3 mr-1" />
                              Certificat
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Aucune mission dans cette organisation
                </p>
              )}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
