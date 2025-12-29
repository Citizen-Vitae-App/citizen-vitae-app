import { useState } from 'react';
import { Search, MoreHorizontal, Eye, Trash2, Calendar, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSuperAdminEvents } from '@/hooks/useSuperAdminEvents';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function EventsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { events, isLoading, deleteEvent } = useSuperAdminEvents();

  const filteredEvents = events?.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.organization_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'public' && event.is_public) ||
      (statusFilter === 'private' && !event.is_public);
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[hsl(210,40%,98%)]">Événements</h2>
        <p className="text-[hsl(215,20.2%,65.1%)]">Supervision de tous les événements de la plateforme</p>
      </div>

      <Card className="bg-[hsl(217.2,32.6%,17.5%)] border-[hsl(217.2,32.6%,20%)]">
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,20.2%,65.1%)]" />
              <Input
                placeholder="Rechercher un événement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[hsl(222.2,84%,4.9%)] border-[hsl(217.2,32.6%,25%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20.2%,50%)]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-[hsl(222.2,84%,4.9%)] border-[hsl(217.2,32.6%,25%)] text-[hsl(210,40%,98%)]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(217.2,32.6%,17.5%)] border-[hsl(217.2,32.6%,25%)]">
                <SelectItem value="all" className="text-[hsl(210,40%,98%)] focus:bg-[hsl(217.2,32.6%,25%)]">Tous</SelectItem>
                <SelectItem value="public" className="text-[hsl(210,40%,98%)] focus:bg-[hsl(217.2,32.6%,25%)]">Publics</SelectItem>
                <SelectItem value="private" className="text-[hsl(210,40%,98%)] focus:bg-[hsl(217.2,32.6%,25%)]">Privés</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="bg-[hsl(217.2,32.6%,25%)] text-[hsl(210,40%,98%)]">
              {filteredEvents.length} événements
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-[hsl(217.2,32.6%,25%)] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-[hsl(217.2,32.6%,25%)] hover:bg-transparent">
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Événement</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Organisation</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Date</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Lieu</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Participants</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Statut</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-[hsl(217.2,32.6%,25%)]">
                      <TableCell><Skeleton className="h-6 w-40 bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32 bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32 bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-12 bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 bg-[hsl(217.2,32.6%,25%)]" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredEvents.length === 0 ? (
                  <TableRow className="border-[hsl(217.2,32.6%,25%)]">
                    <TableCell colSpan={7} className="text-center py-8 text-[hsl(215,20.2%,65.1%)]">
                      Aucun événement trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <TableRow key={event.id} className="border-[hsl(217.2,32.6%,25%)] hover:bg-[hsl(217.2,32.6%,20%)]">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[hsl(215,20.2%,65.1%)]" />
                          <span className="font-medium text-[hsl(210,40%,98%)]">{event.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[hsl(215,20.2%,65.1%)]">
                        {event.organization_name}
                      </TableCell>
                      <TableCell className="text-[hsl(215,20.2%,65.1%)]">
                        {format(new Date(event.start_date), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-[hsl(215,20.2%,65.1%)]">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">{event.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-[hsl(210,40%,98%)]">
                          <Users className="w-3 h-3" />
                          {event.participant_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={event.is_public ? 'default' : 'secondary'}
                          className={event.is_public 
                            ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30' 
                            : 'bg-[hsl(217.2,32.6%,25%)] text-[hsl(215,20.2%,65.1%)]'}
                        >
                          {event.is_public ? 'Public' : 'Privé'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-[hsl(215,20.2%,65.1%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217.2,32.6%,25%)]">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[hsl(217.2,32.6%,17.5%)] border-[hsl(217.2,32.6%,25%)]">
                            <DropdownMenuItem className="text-[hsl(210,40%,98%)] focus:bg-[hsl(217.2,32.6%,25%)] focus:text-[hsl(210,40%,98%)]">
                              <Eye className="w-4 h-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-400 focus:bg-[hsl(217.2,32.6%,25%)] focus:text-red-400"
                              onClick={() => deleteEvent(event.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
