import { useEventParticipants } from '@/hooks/useEventParticipants';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Clock, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface EventParticipantsSectionProps {
  eventId: string;
}

const getCertificationStatus = (participant: {
  certification_start_at: string | null;
  certification_end_at: string | null;
  face_match_passed: boolean | null;
}) => {
  if (participant.certification_end_at) {
    return 'certified';
  }
  if (participant.certification_start_at) {
    return 'arrived';
  }
  if (participant.face_match_passed) {
    return 'ready';
  }
  return 'pending';
};

const getCertificationBadge = (status: string) => {
  switch (status) {
    case 'certified':
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Certifié
        </Badge>
      );
    case 'arrived':
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
          <UserCheck className="h-3 w-3 mr-1" />
          Arrivé
        </Badge>
      );
    case 'ready':
      return (
        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
          <AlertCircle className="h-3 w-3 mr-1" />
          Prêt
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
          <Clock className="h-3 w-3 mr-1" />
          En attente
        </Badge>
      );
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
                <TableHead>Certification</TableHead>
                <TableHead>Arrivée</TableHead>
                <TableHead>Départ</TableHead>
                <TableHead className="text-right">Durée</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((participant) => {
                const certStatus = getCertificationStatus(participant);
                const arrivalTime = participant.certification_start_at 
                  ? format(new Date(participant.certification_start_at), 'HH:mm', { locale: fr })
                  : '-';
                const departureTime = participant.certification_end_at
                  ? format(new Date(participant.certification_end_at), 'HH:mm', { locale: fr })
                  : '-';
                
                let duration = '-';
                if (participant.certification_start_at && participant.certification_end_at) {
                  const start = new Date(participant.certification_start_at);
                  const end = new Date(participant.certification_end_at);
                  const durationMs = end.getTime() - start.getTime();
                  const durationMinutes = Math.round(durationMs / 60000);
                  const hours = Math.floor(durationMinutes / 60);
                  const minutes = durationMinutes % 60;
                  duration = hours > 0 ? `${hours}h${minutes.toString().padStart(2, '0')}` : `${minutes}min`;
                }
                
                return (
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
                      {getCertificationBadge(certStatus)}
                    </TableCell>
                    <TableCell>
                      {participant.certification_start_at ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-sm">{arrivalTime}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {format(new Date(participant.certification_start_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {participant.certification_end_at ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-sm">{departureTime}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {format(new Date(participant.certification_end_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {certStatus === 'certified' ? (
                        <span className="font-medium text-primary">{duration}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
