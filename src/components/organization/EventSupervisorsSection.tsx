import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScanLine, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EventSupervisorsSectionProps {
  eventId: string;
}

interface SupervisorScanInfo {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
  scanCount: number;
  firstScanAt: string;
  lastScanAt: string;
}

const useEventScanners = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ['event-scanners', eventId],
    queryFn: async () => {
      if (!eventId) return [];

      // Get all registrations that have been validated (have validated_by set)
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          validated_by,
          certification_start_at,
          certification_end_at,
          attended_at
        `)
        .eq('event_id', eventId)
        .not('validated_by', 'is', null);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Group scans by validator
      const scannerMap = new Map<string, { count: number; firstScan: string; lastScan: string }>();
      
      for (const reg of data) {
        const validatorId = reg.validated_by!;
        const scanTime = reg.certification_start_at || reg.attended_at || '';
        
        if (!scannerMap.has(validatorId)) {
          scannerMap.set(validatorId, { count: 0, firstScan: scanTime, lastScan: scanTime });
        }
        
        const entry = scannerMap.get(validatorId)!;
        entry.count += 1;
        if (scanTime && (!entry.firstScan || scanTime < entry.firstScan)) entry.firstScan = scanTime;
        if (scanTime && scanTime > entry.lastScan) entry.lastScan = scanTime;
      }

      // Fetch profiles for all validators
      const validatorIds = Array.from(scannerMap.keys());
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .in('id', validatorIds);

      if (profileError) throw profileError;

      const result: SupervisorScanInfo[] = validatorIds.map(id => {
        const profile = profiles?.find(p => p.id === id);
        const scanInfo = scannerMap.get(id)!;
        return {
          userId: id,
          firstName: profile?.first_name || null,
          lastName: profile?.last_name || null,
          email: profile?.email || null,
          avatarUrl: profile?.avatar_url || null,
          scanCount: scanInfo.count,
          firstScanAt: scanInfo.firstScan,
          lastScanAt: scanInfo.lastScan,
        };
      });

      return result.sort((a, b) => b.scanCount - a.scanCount);
    },
    enabled: !!eventId,
  });
};

const getInitials = (firstName: string | null, lastName: string | null) => {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return `${first}${last}`.toUpperCase() || '?';
};

export function EventSupervisorsSection({ eventId }: EventSupervisorsSectionProps) {
  const { data: scanners, isLoading } = useEventScanners(eventId);

  // Don't render anything if no scans have been performed
  if (!isLoading && (!scanners || scanners.length === 0)) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-4 mt-8">
        <div className="flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-xl font-semibold">Responsables de mission</h3>
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center gap-2">
        <ScanLine className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-xl font-semibold">
          Responsables de mission ({scanners!.length})
        </h3>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table className="min-w-[480px]">
          <TableHeader>
            <TableRow>
              <TableHead>Photo</TableHead>
              <TableHead>Nom complet</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Scans effectués</TableHead>
              <TableHead>Premier scan</TableHead>
              <TableHead>Dernier scan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scanners!.map((scanner) => {
              const name = scanner.firstName && scanner.lastName
                ? `${scanner.firstName} ${scanner.lastName}`
                : 'Nom non renseigné';

              return (
                <TableRow key={scanner.userId}>
                  <TableCell>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={scanner.avatarUrl || undefined} />
                      <AvatarFallback>
                        {getInitials(scanner.firstName, scanner.lastName)}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{name}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {scanner.email || 'Email non renseigné'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {scanner.scanCount} scan{scanner.scanCount > 1 ? 's' : ''}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {scanner.firstScanAt ? (
                      <span className="text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(scanner.firstScanAt), 'dd MMM à HH:mm', { locale: fr })}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {scanner.lastScanAt ? (
                      <span className="text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(scanner.lastScanAt), 'dd MMM à HH:mm', { locale: fr })}
                      </span>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
