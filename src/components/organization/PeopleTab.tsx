import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Participant {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  event_count: number;
  last_participation: string;
}

export function PeopleTab() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: participants, isLoading } = useQuery({
    queryKey: ['organization-participants'],
    queryFn: async () => {
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) throw new Error('No organization found');

      // Get all registrations for events of this organization with aggregated data
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          user_id,
          registered_at,
          profiles!inner(
            first_name,
            last_name,
            email,
            avatar_url
          ),
          events!inner(
            organization_id
          )
        `)
        .eq('events.organization_id', membership.organization_id)
        .order('registered_at', { ascending: false });

      if (error) throw error;

      // Aggregate data by user
      const userMap = new Map<string, Participant>();

      data?.forEach((registration: any) => {
        const userId = registration.user_id;
        const profile = registration.profiles;

        if (userMap.has(userId)) {
          const existing = userMap.get(userId)!;
          existing.event_count += 1;
          // Update last participation if this one is more recent
          if (new Date(registration.registered_at) > new Date(existing.last_participation)) {
            existing.last_participation = registration.registered_at;
          }
        } else {
          userMap.set(userId, {
            user_id: userId,
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            avatar_url: profile.avatar_url,
            event_count: 1,
            last_participation: registration.registered_at,
          });
        }
      });

      return Array.from(userMap.values());
    },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Audience</h2>
        <div className="w-72">
          <Input
            placeholder="Rechercher par nom ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !filteredParticipants || filteredParticipants.length === 0 ? (
        <div className="bg-muted rounded-lg p-12 text-center">
          <p className="text-muted-foreground">
            {searchQuery
              ? 'Aucun participant trouvé'
              : 'Aucun participant pour le moment'}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                <TableHead>Nom complet</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Événements participés</TableHead>
                <TableHead className="text-right">Dernière participation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.map((participant) => (
                <TableRow key={participant.user_id}>
                  <TableCell>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={participant.avatar_url || undefined} />
                      <AvatarFallback>
                        {getInitials(participant.first_name, participant.last_name)}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">
                    {participant.first_name && participant.last_name
                      ? `${participant.first_name} ${participant.last_name}`
                      : 'Nom non renseigné'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {participant.email || 'Email non renseigné'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {participant.event_count}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {format(new Date(participant.last_participation), 'dd MMM yyyy', {
                      locale: fr,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
