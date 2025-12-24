import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Users, Ticket, Search } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
interface Participant {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  event_count: number;
  tickets_scanned: number;
  last_participation: string;
  last_status: string;
}
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
export function PeopleTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const isMobile = useIsMobile();
  const {
    data: participants,
    isLoading
  } = useQuery({
    queryKey: ['organization-participants-detailed'],
    queryFn: async () => {
      // Get current user's organization
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const {
        data: membership
      } = await supabase.from('organization_members').select('organization_id').eq('user_id', user.id).single();
      if (!membership) throw new Error('No organization found');

      // Get all registrations for events of this organization with aggregated data
      const {
        data,
        error
      } = await supabase.from('event_registrations').select(`
          user_id,
          status,
          registered_at,
          attended_at,
          profiles:profiles!event_registrations_user_id_fkey(
            first_name,
            last_name,
            email,
            avatar_url
          ),
          events!inner(
            organization_id
          )
        `).eq('events.organization_id', membership.organization_id).order('registered_at', {
        ascending: false
      });
      if (error) throw error;

      // Aggregate data by user
      const userMap = new Map<string, Participant>();
      data?.forEach((registration: any) => {
        const userId = registration.user_id;
        const profile = registration.profiles;
        const hasAttended = registration.attended_at !== null;
        if (userMap.has(userId)) {
          const existing = userMap.get(userId)!;
          existing.event_count += 1;
          if (hasAttended) {
            existing.tickets_scanned += 1;
          }
          // Update last participation if this one is more recent
          if (new Date(registration.registered_at) > new Date(existing.last_participation)) {
            existing.last_participation = registration.registered_at;
            existing.last_status = registration.status;
          }
        } else {
          userMap.set(userId, {
            user_id: userId,
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            avatar_url: profile.avatar_url,
            event_count: 1,
            tickets_scanned: hasAttended ? 1 : 0,
            last_participation: registration.registered_at,
            last_status: registration.status
          });
        }
      });
      return Array.from(userMap.values());
    }
  });
  const filteredParticipants = participants?.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    const email = (p.email || '').toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });
  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || '?';
  };
  return <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom ou email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-muted border-0" />
        </div>
      </div>

      {isLoading ? <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div> : !filteredParticipants || filteredParticipants.length === 0 ? <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-muted mb-6">
              <Users className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? 'Aucun résultat' : 'Votre audience vous attend'}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Aucun participant ne correspond à votre recherche' : 'Les participants à vos événements apparaîtront ici'}
            </p>
          </div>
        </div> : isMobile ?
    // Mobile: Card list view
    <div className="space-y-3">
          {filteredParticipants.map(participant => <div key={participant.user_id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <Avatar className="h-12 w-12 flex-shrink-0">
                <AvatarImage src={participant.avatar_url || undefined} />
                <AvatarFallback>
                  {getInitials(participant.first_name, participant.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm truncate">
                      {participant.first_name && participant.last_name ? `${participant.first_name} ${participant.last_name}` : 'Nom non renseigné'}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {participant.email || 'Email non renseigné'}
                    </p>
                  </div>
                  {getStatusBadge(participant.last_status)}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {participant.event_count} mission{participant.event_count > 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Ticket className="h-3 w-3" />
                    {participant.tickets_scanned} scanné{participant.tickets_scanned > 1 ? 's' : ''}
                  </span>
                  <span>
                    {format(new Date(participant.last_participation), 'dd MMM yyyy', {
                locale: fr
              })}
                  </span>
                </div>
              </div>
            </div>)}
        </div> :
    // Desktop: Table view
    <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                <TableHead>Nom complet</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Missions</TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Ticket className="h-4 w-4" />
                    Scannés
                  </div>
                </TableHead>
                <TableHead className="text-right">Dernière participation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.map(participant => <TableRow key={participant.user_id}>
                  <TableCell>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={participant.avatar_url || undefined} />
                      <AvatarFallback>
                        {getInitials(participant.first_name, participant.last_name)}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">
                    {participant.first_name && participant.last_name ? `${participant.first_name} ${participant.last_name}` : 'Nom non renseigné'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {participant.email || 'Email non renseigné'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(participant.last_status)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {participant.event_count}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {participant.tickets_scanned}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {format(new Date(participant.last_participation), 'dd MMM yyyy', {
                locale: fr
              })}
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </div>}
    </div>;
}