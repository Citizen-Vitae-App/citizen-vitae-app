import { useEventParticipants } from '@/hooks/useEventParticipants';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EventParticipantsSectionProps {
  eventId: string;
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

const getInitials = (firstName: string | null, lastName: string | null) => {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return `${first}${last}`.toUpperCase() || '?';
};

export function EventParticipantsSection({ eventId }: EventParticipantsSectionProps) {
  const { data: participants, isLoading } = useEventParticipants(eventId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-xl font-semibold">Participants inscrits</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-xl font-semibold">
          Participants inscrits ({participants?.length || 0})
        </h3>
      </div>

      {!participants || participants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 border rounded-lg bg-muted/30">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h4 className="text-lg font-medium mb-1">Aucun participant</h4>
          <p className="text-sm text-muted-foreground text-center">
            Les participants inscrits à cet événement apparaîtront ici
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
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Date d'inscription</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((participant) => (
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
                  <TableCell>
                    {getStatusBadge(participant.status)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {format(new Date(participant.registered_at), 'dd MMM yyyy à HH:mm', {
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
