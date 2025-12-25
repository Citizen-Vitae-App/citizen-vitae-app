import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Users, 
  Ticket, 
  Search, 
  UserPlus, 
  MoreHorizontal, 
  Eye, 
  Mail,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Info,
  TrendingUp,
  CalendarIcon,
  X
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ContributorProfilePanel } from './ContributorProfilePanel';
import { InviteContributorsDialog } from './InviteContributorsDialog';
import { ContributorContactDialog } from './ContributorContactDialog';

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
  first_registered_at: string;
}

interface Filters {
  status: string | null;
  missionsOperator: 'gte' | 'lte' | null;
  missionsValue: number | null;
  scannedOperator: 'gte' | 'lte' | null;
  scannedValue: number | null;
  dateOperator: 'before' | 'after' | null;
  dateValue: Date | null;
}

type SortField = 'name' | 'email' | null;
type SortDirection = 'asc' | 'desc';

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
  const [filters, setFilters] = useState<Filters>({
    status: null,
    missionsOperator: null,
    missionsValue: null,
    scannedOperator: null,
    scannedValue: null,
    dateOperator: null,
    dateValue: null,
  });
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedContributor, setSelectedContributor] = useState<Participant | null>(null);
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactContributor, setContactContributor] = useState<Participant | null>(null);
  
  const isMobile = useIsMobile();

  const { data: organizationData } = useQuery({
    queryKey: ['user-organization'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id, organizations(id, name)')
        .eq('user_id', user.id)
        .single();
      
      return {
        organization: membership?.organizations || null,
        userId: user.id,
      };
    }
  });

  const organization = organizationData?.organization;
  const currentUserId = organizationData?.userId;

  const { data: participants, isLoading } = useQuery({
    queryKey: ['organization-participants-detailed'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      
      if (!membership) throw new Error('No organization found');

      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
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
        `)
        .eq('events.organization_id', membership.organization_id)
        .order('registered_at', { ascending: false });
      
      if (error) throw error;

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
          if (new Date(registration.registered_at) > new Date(existing.last_participation)) {
            existing.last_participation = registration.registered_at;
            existing.last_status = registration.status;
          }
          if (new Date(registration.registered_at) < new Date(existing.first_registered_at)) {
            existing.first_registered_at = registration.registered_at;
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
            last_status: registration.status,
            first_registered_at: registration.registered_at,
          });
        }
      });
      
      return Array.from(userMap.values());
    }
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!participants) return { total: 0, engagementRate: 0, newThisMonth: 0, growthPercent: null };
    
    const total = participants.length;
    const totalMissions = participants.reduce((sum, p) => sum + p.event_count, 0);
    const totalScanned = participants.reduce((sum, p) => sum + p.tickets_scanned, 0);
    const engagementRate = totalMissions > 0 ? Math.round((totalScanned / totalMissions) * 100) : 0;
    
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    
    const newThisMonth = participants.filter(p => {
      const date = new Date(p.first_registered_at);
      return date >= thisMonthStart && date <= thisMonthEnd;
    }).length;
    
    const newLastMonth = participants.filter(p => {
      const date = new Date(p.first_registered_at);
      return date >= lastMonthStart && date <= lastMonthEnd;
    }).length;
    
    const growthPercent = newLastMonth > 0 
      ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
      : newThisMonth > 0 ? 100 : null;
    
    return { total, engagementRate, newThisMonth, growthPercent };
  }, [participants]);

  // Get unique statuses
  const availableStatuses = useMemo(() => {
    if (!participants) return [];
    return [...new Set(participants.map(p => p.last_status))];
  }, [participants]);

  // Filter and sort participants
  const filteredParticipants = useMemo(() => {
    if (!participants) return [];
    
    let result = participants.filter(p => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
        const email = (p.email || '').toLowerCase();
        if (!fullName.includes(query) && !email.includes(query)) return false;
      }
      
      if (filters.status && p.last_status !== filters.status) return false;
      
      if (filters.missionsOperator && filters.missionsValue !== null) {
        if (filters.missionsOperator === 'gte' && p.event_count < filters.missionsValue) return false;
        if (filters.missionsOperator === 'lte' && p.event_count > filters.missionsValue) return false;
      }
      
      if (filters.scannedOperator && filters.scannedValue !== null) {
        if (filters.scannedOperator === 'gte' && p.tickets_scanned < filters.scannedValue) return false;
        if (filters.scannedOperator === 'lte' && p.tickets_scanned > filters.scannedValue) return false;
      }
      
      if (filters.dateOperator && filters.dateValue) {
        const participationDate = new Date(p.last_participation);
        if (filters.dateOperator === 'before' && participationDate >= filters.dateValue) return false;
        if (filters.dateOperator === 'after' && participationDate <= filters.dateValue) return false;
      }
      
      return true;
    });
    
    if (sortField) {
      result = [...result].sort((a, b) => {
        let aVal = '';
        let bVal = '';
        
        if (sortField === 'name') {
          aVal = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
          bVal = `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase();
        } else if (sortField === 'email') {
          aVal = (a.email || '').toLowerCase();
          bVal = (b.email || '').toLowerCase();
        }
        
        const comparison = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    return result;
  }, [participants, searchQuery, filters, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const clearFilters = () => {
    setFilters({
      status: null,
      missionsOperator: null,
      missionsValue: null,
      scannedOperator: null,
      scannedValue: null,
      dateOperator: null,
      dateValue: null,
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== null);

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  const handleViewProfile = (participant: Participant) => {
    setSelectedContributor(participant);
    setProfilePanelOpen(true);
  };

  const handleContact = (participant: Participant) => {
    setContactContributor(participant);
    setContactDialogOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-transparent">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total contributeurs</p>
              <p className="text-2xl font-bold mt-1">{kpis.total}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </div>
        
        <div className="p-4 rounded-xl border border-border bg-transparent">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Taux d'engagement</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-48">
                        Ratio entre vos contributeurs certifiés (scannés) et le total des inscriptions aux missions.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-2xl font-bold mt-1">{kpis.engagementRate}%</p>
            </div>
            <Ticket className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </div>
        
        <div className="p-4 rounded-xl border border-border bg-transparent">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Nouveaux ce mois</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold">{kpis.newThisMonth}</p>
                {kpis.growthPercent !== null && (
                  <span className={`text-sm font-medium flex items-center gap-0.5 ${kpis.growthPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <TrendingUp className={`h-3.5 w-3.5 ${kpis.growthPercent < 0 ? 'rotate-180' : ''}`} />
                    {kpis.growthPercent >= 0 ? '+' : ''}{kpis.growthPercent}%
                  </span>
                )}
              </div>
            </div>
            <UserPlus className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </div>
      </div>

      {/* Search and Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-2 flex-1">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par nom ou email..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="pl-10 bg-muted border-0" 
            />
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select 
              value={filters.status || '_all'} 
              onValueChange={(v) => setFilters(prev => ({ ...prev, status: v === '_all' ? null : v }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous</SelectItem>
                {availableStatuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status === 'registered' ? 'Inscrit' :
                     status === 'approved' ? 'Approuvé' :
                     status === 'attended' ? 'Présent' :
                     status === 'waitlist' ? 'Liste d\'attente' : status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Filter className="h-4 w-4" />
                  Filtres
                  {hasActiveFilters && <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">!</Badge>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Filtres avancés</h4>
                  
                  {/* Missions filter */}
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Missions</label>
                    <div className="flex gap-2">
                      <Select 
                        value={filters.missionsOperator || '_none'} 
                        onValueChange={(v) => setFilters(prev => ({ ...prev, missionsOperator: v === '_none' ? null : v as 'gte' | 'lte' }))}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Op." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">-</SelectItem>
                          <SelectItem value="gte">≥</SelectItem>
                          <SelectItem value="lte">≤</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input 
                        type="number" 
                        placeholder="Valeur"
                        value={filters.missionsValue ?? ''}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          missionsValue: e.target.value ? parseInt(e.target.value) : null 
                        }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  {/* Scanned filter */}
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Scannées</label>
                    <div className="flex gap-2">
                      <Select 
                        value={filters.scannedOperator || '_none'} 
                        onValueChange={(v) => setFilters(prev => ({ ...prev, scannedOperator: v === '_none' ? null : v as 'gte' | 'lte' }))}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Op." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">-</SelectItem>
                          <SelectItem value="gte">≥</SelectItem>
                          <SelectItem value="lte">≤</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input 
                        type="number" 
                        placeholder="Valeur"
                        value={filters.scannedValue ?? ''}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          scannedValue: e.target.value ? parseInt(e.target.value) : null 
                        }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  {/* Date filter */}
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Dernière participation</label>
                    <div className="flex gap-2">
                      <Select 
                        value={filters.dateOperator || '_none'} 
                        onValueChange={(v) => setFilters(prev => ({ ...prev, dateOperator: v === '_none' ? null : v as 'before' | 'after' }))}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Op." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">-</SelectItem>
                          <SelectItem value="before">Avant</SelectItem>
                          <SelectItem value="after">Après</SelectItem>
                        </SelectContent>
                      </Select>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.dateValue ? format(filters.dateValue, 'dd/MM/yyyy') : 'Date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={filters.dateValue || undefined}
                            onSelect={(date) => setFilters(prev => ({ ...prev, dateValue: date || null }))}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
                      <X className="h-4 w-4 mr-2" />
                      Effacer les filtres
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <Button onClick={() => setInviteDialogOpen(true)} className="shrink-0">
          <UserPlus className="h-4 w-4 mr-2" />
          Inviter des bénévoles
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : !filteredParticipants || filteredParticipants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-muted mb-6">
              <Users className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery || hasActiveFilters ? 'Aucun résultat' : 'Votre audience vous attend'}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery || hasActiveFilters 
                ? 'Aucun contributeur ne correspond à vos critères' 
                : 'Les participants à vos événements apparaîtront ici'}
            </p>
          </div>
        </div>
      ) : isMobile ? (
        // Mobile: Card list view
        <div className="space-y-3">
          {filteredParticipants.map(participant => (
            <div key={participant.user_id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
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
                      {participant.first_name && participant.last_name 
                        ? `${participant.first_name} ${participant.last_name}` 
                        : 'Nom non renseigné'}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {participant.email || 'Email non renseigné'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(participant.last_status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewProfile(participant)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Voir le profil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleContact(participant)}>
                          <Mail className="h-4 w-4 mr-2" />
                          Contacter
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
                    {format(new Date(participant.last_participation), 'dd MMM yyyy', { locale: fr })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Desktop: Table view
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                <TableHead>
                  <button 
                    className="flex items-center hover:text-foreground transition-colors"
                    onClick={() => toggleSort('name')}
                  >
                    Nom complet
                    {getSortIcon('name')}
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    className="flex items-center hover:text-foreground transition-colors"
                    onClick={() => toggleSort('email')}
                  >
                    Email
                    {getSortIcon('email')}
                  </button>
                </TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Missions</TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Ticket className="h-4 w-4" />
                    Scannés
                  </div>
                </TableHead>
                <TableHead className="text-right">Dernière participation</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.map(participant => (
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
                    {getStatusBadge(participant.last_status)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {participant.event_count}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {participant.tickets_scanned}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {format(new Date(participant.last_participation), 'dd MMM yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewProfile(participant)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Voir le profil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleContact(participant)}>
                          <Mail className="h-4 w-4 mr-2" />
                          Contacter
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs and Panels */}
      <ContributorProfilePanel
        userId={selectedContributor?.user_id || null}
        organizationId={organization?.id || ''}
        open={profilePanelOpen}
        onOpenChange={setProfilePanelOpen}
      />

      <InviteContributorsDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        organizationId={organization?.id || ''}
        organizationName={organization?.name || 'Votre organisation'}
        userId={currentUserId}
      />

      <ContributorContactDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        contributor={contactContributor}
        organizationName={organization?.name || 'Votre organisation'}
      />
    </div>
  );
}
