import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, ChevronRight, Calendar, Users, Globe, Lock } from 'lucide-react';
import { useOrganizationEvents } from '@/hooks/useEvents';
import { useEventsParticipantCounts } from '@/hooks/useEventParticipants';
import { format, isAfter, isBefore, parseISO, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import defaultEventCover from '@/assets/default-event-cover.jpg';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
const getEventStatus = (startDate: string, endDate: string) => {
  const now = new Date();
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (isBefore(end, now)) {
    return 'Passé';
  }
  if (isAfter(start, now)) {
    return 'À venir';
  }
  return 'Live';
};
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Draft':
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Draft</Badge>;
    case 'À venir':
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">À venir</Badge>;
    case 'Live':
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">​En cours </Badge>;
    case 'Passé':
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">Passé</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};
const getVisibilityBadge = (isPublic: boolean) => {
  if (isPublic) {
    return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
        <Globe className="h-3 w-3 mr-1" />
        Public
      </Badge>;
  }
  return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
      <Lock className="h-3 w-3 mr-1" />
      Privé
    </Badge>;
};
const getInitials = (firstName: string | null, lastName: string | null) => {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return `${first}${last}`.toUpperCase() || '?';
};
const formatMobileEventDate = (startDate: string, endDate: string) => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (isSameDay(start, end)) {
    // Single day: "10 déc. 2025 à 00:22"
    return format(start, "d MMM yyyy 'à' HH:mm", {
      locale: fr
    });
  }

  // Multi-day: "Du 10 déc. à 00:22 au 13 déc. 2025 à 01:42"
  const startFormatted = format(start, "d MMM 'à' HH:mm", {
    locale: fr
  });
  const endFormatted = format(end, "d MMM yyyy 'à' HH:mm", {
    locale: fr
  });
  return `Du ${startFormatted} au ${endFormatted}`;
};
export function EventsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const isMobile = useIsMobile();
  const {
    events: allEvents,
    isLoading,
    error
  } = useOrganizationEvents();
  const navigate = useNavigate();

  // Client-side filtering to avoid refetch on each keystroke
  const events = useMemo(() => {
    if (!searchQuery.trim()) return allEvents;
    const query = searchQuery.toLowerCase();
    return allEvents.filter(event => event.name.toLowerCase().includes(query) || event.location.toLowerCase().includes(query));
  }, [allEvents, searchQuery]);

  // Get all event IDs for participant counts
  const eventIds = useMemo(() => allEvents.map(e => e.id), [allEvents]);
  const {
    data: participantCounts
  } = useEventsParticipantCounts(eventIds);
  if (isLoading) {
    return <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  if (error) {
    return <div className="text-center py-12 text-destructive">
        Erreur lors du chargement des événements
      </div>;
  }
  return <div className="space-y-4 md:space-y-6">
      {/* Header avec titre et bouton */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-bold">My Events</h2>
        <Button asChild size={isMobile ? "sm" : "default"}>
          <Link to="/organization/create-event">
            <Plus className="mr-1 md:mr-2 h-4 w-4" />
            {isMobile ? "Créer" : "Créer"}
          </Link>
        </Button>
      </div>

      {/* Barre de recherche pleine largeur */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher un événement..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 w-full bg-muted border-0" />
      </div>

      {/* Liste des événements */}
      <div>
        {events.length === 0 ? <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Aucun événement</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Aucun événement ne correspond à votre recherche' : 'Créez votre premier événement pour commencer'}
            </p>
            {!searchQuery && <Button asChild>
                <Link to="/organization/create-event">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un événement
                </Link>
              </Button>}
          </div> : isMobile ?
      // Mobile: Card list view
      <div className="space-y-3">
            {events.map(event => {
          const status = getEventStatus(event.start_date, event.end_date);
          const eventParticipants = participantCounts?.get(event.id);
          const participantCount = eventParticipants?.count || 0;
          return <div key={event.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/organization/events/${event.id}/edit`)}>
                  <img src={event.cover_image_url || defaultEventCover} alt={event.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{event.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatMobileEventDate(event.start_date, event.end_date)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(status)}
                      {getVisibilityBadge(event.is_public ?? true)}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {participantCount}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>;
        })}
          </div> :
      // Desktop: Table view
      <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="font-semibold">Titre</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold">Visibilité</TableHead>
                <TableHead className="font-semibold">Lieu</TableHead>
                <TableHead className="font-semibold">Participants</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map(event => {
            const status = getEventStatus(event.start_date, event.end_date);
            const eventParticipants = participantCounts?.get(event.id);
            const participantCount = eventParticipants?.count || 0;
            const participants = eventParticipants?.participants || [];
            return <TableRow key={event.id} className="cursor-pointer hover:bg-muted/50 border-0" onClick={() => navigate(`/organization/events/${event.id}/edit`)}>
                    <TableCell className="max-w-[300px]">
                      <div className="flex items-center gap-3">
                        <img src={event.cover_image_url || defaultEventCover} alt={event.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate" title={event.name}>{event.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {format(parseISO(event.start_date), "d MMMM yyyy 'à' HH'h'mm", {
                        locale: fr
                      })}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(status)}</TableCell>
                    <TableCell>{getVisibilityBadge(event.is_public ?? true)}</TableCell>
                    <TableCell>{event.location}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <HoverCard openDelay={200}>
                        <HoverCardTrigger asChild>
                          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                            <Users className="h-4 w-4" />
                            <span className="font-medium">{participantCount}</span>
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent align="start" className="w-72 p-0">
                          <div className="p-3 border-b border-border">
                            <h4 className="font-semibold text-sm">Participants inscrits</h4>
                          </div>
                          {participants.length === 0 ? <div className="p-4 text-center text-sm text-muted-foreground">
                              Aucun participant inscrit
                            </div> : <div className="max-h-60 overflow-y-auto">
                              {participants.slice(0, 5).map(participant => <div key={participant.user_id} className="flex items-center gap-3 p-3 border-b border-border last:border-0">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={participant.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {getInitials(participant.first_name, participant.last_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {participant.first_name && participant.last_name ? `${participant.first_name} ${participant.last_name}` : 'Nom non renseigné'}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {participant.email}
                                    </p>
                                  </div>
                                </div>)}
                              {participants.length > 5 && <div className="p-3 text-center text-sm text-muted-foreground bg-muted/50">
                                  + {participants.length - 5} autres participants
                                </div>}
                            </div>}
                        </HoverCardContent>
                      </HoverCard>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </TableCell>
                  </TableRow>;
          })}
            </TableBody>
          </Table>}
      </div>
    </div>;
}