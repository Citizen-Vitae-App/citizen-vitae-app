import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CertificationLog {
  id: string;
  user_id: string | null;
  event_id: string | null;
  registration_id: string | null;
  action: string;
  status: string;
  method: string;
  ip_address: string | null;
  latitude: number | null;
  longitude: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // Joined fields
  user_first_name: string | null;
  user_last_name: string | null;
  user_email: string | null;
  event_name: string | null;
}

interface UseCertificationLogsParams {
  page: number;
  pageSize: number;
  statusFilter: string | null;
  search: string;
  dateFrom: string | null;
  dateTo: string | null;
}

export function useCertificationLogs({
  page,
  pageSize,
  statusFilter,
  search,
  dateFrom,
  dateTo,
}: UseCertificationLogsParams) {
  return useQuery({
    queryKey: ['certification-logs', page, pageSize, statusFilter, search, dateFrom, dateTo],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('certification_logs')
        .select(`
          id,
          user_id,
          event_id,
          registration_id,
          action,
          status,
          method,
          ip_address,
          latitude,
          longitude,
          metadata,
          created_at,
          profiles!certification_logs_user_id_fkey (first_name, last_name, email),
          events!certification_logs_event_id_fkey (name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59.999Z');
      }

      if (search) {
        // We need to filter by user name or email - use a text search on joined profiles
        // Since Supabase doesn't support filtering on joined tables easily,
        // we'll fetch and filter client-side for search, or use an RPC.
        // For now, we filter on action as a fallback and do client-side name filtering.
        // Better approach: use profiles filter via inner join
        query = query.or(`action.ilike.%${search}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform joined data
      const logs: CertificationLog[] = (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        event_id: row.event_id,
        registration_id: row.registration_id,
        action: row.action,
        status: row.status,
        method: row.method,
        ip_address: row.ip_address,
        latitude: row.latitude,
        longitude: row.longitude,
        metadata: row.metadata,
        created_at: row.created_at,
        user_first_name: row.profiles?.first_name ?? null,
        user_last_name: row.profiles?.last_name ?? null,
        user_email: row.profiles?.email ?? null,
        event_name: row.events?.name ?? null,
      }));

      // Client-side search filter on user name/email if search is provided
      const filtered = search
        ? logs.filter((log) => {
            const searchLower = search.toLowerCase();
            const fullName = `${log.user_first_name || ''} ${log.user_last_name || ''}`.toLowerCase();
            const email = (log.user_email || '').toLowerCase();
            return fullName.includes(searchLower) || email.includes(searchLower);
          })
        : logs;

      return {
        logs: filtered,
        totalCount: count ?? 0,
      };
    },
  });
}
