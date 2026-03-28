import { useState } from 'react';
import { useEventParticipants } from '@/hooks/useEventParticipants';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Users, Clock, CheckCircle2, UserCheck, AlertCircle, Loader2, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

interface EventParticipantsSectionProps {
  eventId: string;
  eventEndDate?: string;
}

const getCertificationStatus = (participant: {
  certification_start_at: string | null;
  certification_end_at: string | null;
  face_match_passed: boolean | null;
  status: string;
}) => {
  if (participant.status === 'self_certified') return 'self_certified';
  if (participant.certification_end_at) return 'certified';
  if (participant.certification_start_at) return 'arrived';
  if (participant.face_match_passed) return 'ready';
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
    case 'self_certified':
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
          <UserCheck className="h-3 w-3 mr-1" />
          Auto-certifié
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

export function EventParticipantsSection({ eventId, eventEndDate }: EventParticipantsSectionProps) {
  const { data: participants, isLoading } = useEventParticipants(eventId);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [certifyingId, setCertifyingId] = useState<string | null>(null);

  // Check if we're in manual validation mode (past H+1)
  const isManualValidationMode = eventEndDate 
    ? new Date() > new Date(new Date(eventEndDate).getTime() + 60 * 60 * 1000) 
    : false;

  const handleManualCertify = async (registrationId: string, participantName: string) => {
    if (!user) return;
    setCertifyingId(registrationId);

    try {
      const now = new Date().toISOString();

      // Update registration with certification timestamps
      const { error: rpcError } = await supabase.rpc('update_registration_certification', {
        _registration_id: registrationId,
        _status: 'attended',
        _attended_at: now,
        _certification_start_at: now,
        _certification_end_at: now,
        _validated_by: user.id,
      });

      if (rpcError) throw rpcError;

      // Generate certificate
      try {
        await supabase.functions.invoke('generate-certificate', {
          body: {
            registration_id: registrationId,
            validated_by: user.id,
          },
        });
      } catch (certErr) {
        logger.error('Error generating certificate after manual validation:', certErr);
      }

      queryClient.invalidateQueries({ queryKey: ['event-participants', eventId] });

      toast({
        title: 'Présence certifiée',
        description: `${participantName} a été certifié(e) manuellement.`,
      });
    } catch (err) {
      logger.error('Manual certification error:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de certifier la présence.',
        variant: 'destructive',
      });
    } finally {
      setCertifyingId(null);
    }
  };

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

  const hasUncertifiedParticipants = participants?.some(p => {
    const status = getCertificationStatus(p);
    return status !== 'certified' && status !== 'self_certified';
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-xl font-semibold">
            Participants inscrits ({participants?.length || 0})
          </h3>
        </div>
        {isManualValidationMode && hasUncertifiedParticipants && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
            <Clock className="h-3 w-3 mr-1" />
            Mode validation manuelle
          </Badge>
        )}
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
                <TableHead className="text-right">
                  {isManualValidationMode ? 'Action' : 'Durée'}
                </TableHead>
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

                const participantName = participant.first_name && participant.last_name
                  ? `${participant.first_name} ${participant.last_name}`
                  : 'Nom non renseigné';

                const canManualCertify = isManualValidationMode && 
                  certStatus !== 'certified' && certStatus !== 'self_certified';
                
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
                    <TableCell className="font-medium">{participantName}</TableCell>
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
                      {canManualCertify ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={certifyingId === participant.registration_id}
                          onClick={() => handleManualCertify(participant.registration_id, participantName)}
                        >
                          {certifyingId === participant.registration_id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Shield className="h-3.5 w-3.5" />
                          )}
                          Certifier
                        </Button>
                      ) : certStatus === 'certified' || certStatus === 'self_certified' ? (
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
