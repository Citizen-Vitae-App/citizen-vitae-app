import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, ChevronRight, Calendar } from 'lucide-react';
import { useOrganizationEvents } from '@/hooks/useEvents';
import { format, isAfter, isBefore, isToday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import defaultEventCover from '@/assets/default-event-cover.jpg';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Live</Badge>;
    case 'Passé':
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">Passé</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export function EventsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const { events, isLoading, error } = useOrganizationEvents(searchQuery);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Erreur lors du chargement des événements
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec titre et bouton */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">My Events</h2>
        <Button asChild>
          <Link to="/organization/create-event">
            <Plus className="mr-2 h-4 w-4" />
            Créer
          </Link>
        </Button>
      </div>

      {/* Barre de recherche pleine largeur */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un événement..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 w-full bg-muted border-0"
        />
      </div>

      {/* Table des événements */}
      <div>
        {events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Aucun événement</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Aucun événement ne correspond à votre recherche' : 'Créez votre premier événement pour commencer'}
            </p>
            {!searchQuery && (
              <Button asChild>
                <Link to="/organization/create-event">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un événement
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="font-semibold">Nom</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold">Lieu</TableHead>
                <TableHead className="font-semibold">Capacité</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const status = getEventStatus(event.start_date, event.end_date);
                return (
                  <TableRow 
                    key={event.id}
                    className="cursor-pointer hover:bg-muted/50 border-0"
                    onClick={() => navigate(`/organization/events/${event.id}/edit`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img 
                          src={event.cover_image_url || defaultEventCover} 
                          alt={event.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{event.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {format(parseISO(event.start_date), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(status)}</TableCell>
                    <TableCell>{event.location}</TableCell>
                    <TableCell>{event.capacity || 'Illimitée'}</TableCell>
                    <TableCell>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
