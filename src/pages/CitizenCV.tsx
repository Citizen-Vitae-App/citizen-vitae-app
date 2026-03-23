import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, Building2, ShieldCheck } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as Icons from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import sigle from '@/assets/icon-sigle.svg';

export default function CitizenCV() {
  const { userId } = useParams<{ userId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['citizen-cv', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No userId');

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, id_verified')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Fetch public certified missions
      const { data: registrations, error: regError } = await supabase
        .from('event_registrations')
        .select(`
          id,
          event_id,
          attended_at,
          events (
            id,
            name,
            start_date,
            end_date,
            organization_id,
            organizations (
              name,
              logo_url
            )
          )
        `)
        .eq('user_id', userId)
        .eq('face_match_passed', true)
        .eq('is_public', true)
        .not('attended_at', 'is', null)
        .order('attended_at', { ascending: false });

      if (regError) throw regError;

      // Fetch causes for all events
      const eventIds = (registrations || []).map((r: any) => r.events?.id).filter(Boolean);
      
      let causesMap: Record<string, Array<{ id: string; name: string; icon: string; color: string }>> = {};
      if (eventIds.length > 0) {
        const { data: eventCauses } = await supabase
          .from('event_cause_themes')
          .select(`
            event_id,
            cause_themes (id, name, icon, color)
          `)
          .in('event_id', eventIds);

        (eventCauses || []).forEach((ec: any) => {
          if (!causesMap[ec.event_id]) causesMap[ec.event_id] = [];
          const t = ec.cause_themes;
          if (t) causesMap[ec.event_id].push({ id: t.id, name: t.name, icon: t.icon, color: t.color });
        });
      }

      const missions = (registrations || []).map((reg: any) => {
        const event = reg.events;
        const org = event?.organizations;
        return {
          id: reg.id,
          event_name: event?.name || '',
          organization_name: org?.name || 'Organisation',
          organization_logo: org?.logo_url,
          start_date: event?.start_date,
          end_date: event?.end_date,
          causes: causesMap[event?.id] || [],
        };
      });

      return { profile, missions };
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-lg px-4 space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Profil introuvable</p>
          <p className="text-sm text-muted-foreground">Ce CV citoyen n'est pas disponible.</p>
        </div>
      </div>
    );
  }

  const { profile, missions } = data;
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Citoyen';
  const initials = [profile.first_name?.[0], profile.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'C';

  return (
    <>
      <Helmet>
        <title>CV Citoyen de {fullName} | Citizen Vitae</title>
        <meta name="description" content={`Découvrez les expériences citoyennes certifiées de ${fullName} sur Citizen Vitae.`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-primary/5 border-b">
          <div className="container mx-auto px-4 py-8 max-w-lg">
            <div className="flex items-center justify-center mb-4">
              <img src={sigle} alt="Citizen Vitae" className="h-6 w-6 opacity-60" />
            </div>
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-20 w-20 border-2 border-background shadow">
                <AvatarImage src={profile.avatar_url || undefined} alt={fullName} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h1 className="text-xl font-bold">{fullName}</h1>
                {profile.id_verified && (
                  <div className="flex items-center justify-center gap-1 mt-1 text-primary text-sm">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Identité vérifiée</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {missions.length} expérience{missions.length !== 1 ? 's' : ''} certifiée{missions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Missions list */}
        <div className="container mx-auto px-4 py-6 max-w-lg">
          {missions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucune expérience publique à afficher.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {missions.map((mission: any) => (
                <MissionPublicCard key={mission.id} mission={mission} />
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-xs text-muted-foreground">
              Certifié par <span className="font-medium text-foreground">Citizen Vitae</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function MissionPublicCard({ mission }: { mission: any }) {
  const formatDate = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isSameDay(start, end)) return format(start, 'd MMMM yyyy', { locale: fr });
    return format(start, 'd MMMM yyyy', { locale: fr });
  };

  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={mission.organization_logo || undefined} alt={mission.organization_name} />
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            {mission.organization_name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{mission.event_name}</h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <Building2 className="h-3 w-3" />
            {mission.organization_name}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="h-3 w-3" />
            {formatDate(mission.start_date, mission.end_date)}
          </p>
          {mission.causes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {mission.causes.map((cause: any) => {
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
  );
}
