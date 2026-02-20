import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { QrCode, MapPin, ScanFace, Search, ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react';
import { useCertificationLogs, type CertificationLog } from '@/hooks/useCertificationLogs';
import { formatDate } from '@/i18n/utils/formatting';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'success', label: 'Succès' },
  { value: 'failure', label: 'Échec' },
  { value: 'suspicious', label: 'Suspect' },
];

function getMethodIcon(method: string) {
  switch (method) {
    case 'qr_code':
      return <QrCode className="w-4 h-4" />;
    case 'face_match':
      return <ScanFace className="w-4 h-4" />;
    case 'self_certification':
      return <MapPin className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
}

function getMethodLabel(method: string) {
  switch (method) {
    case 'qr_code': return 'QR Code';
    case 'face_match': return 'Face Match';
    case 'self_certification': return 'Auto-certif.';
    default: return method;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'success':
      return <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30 hover:bg-emerald-600/30">Succès</Badge>;
    case 'failure':
      return <Badge className="bg-red-600/20 text-red-400 border-red-600/30 hover:bg-red-600/30">Échec</Badge>;
    case 'suspicious':
      return <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/30 hover:bg-orange-600/30 animate-pulse">Suspect</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getActionLabel(action: string) {
  const labels: Record<string, string> = {
    qr_scan_arrival: 'Scan arrivée',
    qr_scan_departure: 'Scan départ',
    self_certification: 'Auto-certification',
    face_match_attempt: 'Tentative Face Match',
    face_match_success: 'Face Match réussi',
    face_match_failure: 'Face Match échoué',
  };
  return labels[action] || action;
}

export function LogsTab() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useCertificationLogs({
    page,
    pageSize: PAGE_SIZE,
    statusFilter: statusFilter === 'all' ? null : statusFilter,
    search,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
  });

  const totalPages = Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[hsl(210,40%,98%)]">Logs de certification</h2>
          <p className="text-[hsl(215,20.2%,65.1%)]">
            Suivi des certifications de présence
            {data?.totalCount != null && (
              <span className="ml-2 text-[hsl(210,40%,98%)]">— {data.totalCount} entrée{data.totalCount !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-[hsl(217.2,32.6%,17.5%)] border-[hsl(217.2,32.6%,20%)]">
        <CardContent className="pt-4 pb-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-[hsl(215,20.2%,65.1%)] mb-1 block">Recherche</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,20.2%,65.1%)]" />
              <Input
                placeholder="Nom ou email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9 bg-[hsl(222.2,84%,4.9%)] border-[hsl(217.2,32.6%,20%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20.2%,45%)]"
              />
            </div>
          </div>

          <div className="w-[140px]">
            <label className="text-xs text-[hsl(215,20.2%,65.1%)] mb-1 block">Statut</label>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="bg-[hsl(222.2,84%,4.9%)] border-[hsl(217.2,32.6%,20%)] text-[hsl(210,40%,98%)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(217.2,32.6%,17.5%)] border-[hsl(217.2,32.6%,20%)]">
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-[hsl(210,40%,98%)]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[160px]">
            <label className="text-xs text-[hsl(215,20.2%,65.1%)] mb-1 block">Date début</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
              className="bg-[hsl(222.2,84%,4.9%)] border-[hsl(217.2,32.6%,20%)] text-[hsl(210,40%,98%)]"
            />
          </div>

          <div className="w-[160px]">
            <label className="text-xs text-[hsl(215,20.2%,65.1%)] mb-1 block">Date fin</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
              className="bg-[hsl(222.2,84%,4.9%)] border-[hsl(217.2,32.6%,20%)] text-[hsl(210,40%,98%)]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-[hsl(217.2,32.6%,17.5%)] border-[hsl(217.2,32.6%,20%)]">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[hsl(215,20.2%,65.1%)]" />
            </div>
          ) : !data?.logs.length ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-[hsl(217.2,32.6%,25%)] flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-[hsl(215,20.2%,65.1%)]" />
              </div>
              <h3 className="text-lg font-medium text-[hsl(210,40%,98%)] mb-2">Aucun log</h3>
              <p className="text-[hsl(215,20.2%,65.1%)] text-center max-w-md">
                Les logs de certification apparaîtront ici lorsque des utilisateurs effectueront des actions de certification.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[hsl(217.2,32.6%,20%)] hover:bg-transparent">
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Horodatage</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Utilisateur</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Événement</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Action</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Méthode</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Statut</TableHead>
                  <TableHead className="text-[hsl(215,20.2%,65.1%)]">Localisation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.logs.map((log: CertificationLog) => (
                  <TableRow key={log.id} className="border-[hsl(217.2,32.6%,20%)] hover:bg-[hsl(217.2,32.6%,20%)]">
                    <TableCell className="text-[hsl(210,40%,98%)] whitespace-nowrap text-xs">
                      {formatDate(log.created_at, 'dd/MM/yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-[hsl(210,40%,98%)] text-sm">
                          {log.user_first_name || log.user_last_name
                            ? `${log.user_first_name ?? ''} ${log.user_last_name ?? ''}`.trim()
                            : '—'}
                        </div>
                        {log.user_email && (
                          <div className="text-[hsl(215,20.2%,65.1%)] text-xs">{log.user_email}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[hsl(210,40%,98%)] text-sm max-w-[200px] truncate">
                      {log.event_name || '—'}
                    </TableCell>
                    <TableCell className="text-[hsl(215,20.2%,65.1%)] text-xs">
                      {getActionLabel(log.action)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-[hsl(210,40%,98%)] text-sm">
                        {getMethodIcon(log.method)}
                        <span>{getMethodLabel(log.method)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-[hsl(215,20.2%,65.1%)] text-xs whitespace-nowrap">
                      {log.latitude != null && log.longitude != null
                        ? `${Number(log.latitude).toFixed(4)}, ${Number(log.longitude).toFixed(4)}`
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(217.2,32.6%,20%)]">
              <p className="text-xs text-[hsl(215,20.2%,65.1%)]">
                Page {page + 1} / {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="border-[hsl(217.2,32.6%,20%)] text-[hsl(210,40%,98%)] hover:bg-[hsl(217.2,32.6%,20%)]"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="border-[hsl(217.2,32.6%,20%)] text-[hsl(210,40%,98%)] hover:bg-[hsl(217.2,32.6%,20%)]"
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
