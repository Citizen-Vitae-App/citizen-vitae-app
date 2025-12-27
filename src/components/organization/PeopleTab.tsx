import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
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
  Award, 
  Search, 
  UserPlus, 
  MoreVertical, 
  Eye, 
  Mail,
  ArrowUp,
  ArrowDown,
  Filter,
  Info,
  TrendingUp,
  CalendarIcon,
  RefreshCw,
  Clock,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ContributorProfilePanel } from './ContributorProfilePanel';
import { InviteContributorsDialog } from './InviteContributorsDialog';
import { ContributorContactDialog } from './ContributorContactDialog';
import { toast } from 'sonner';

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
  is_pending_invitation?: boolean;
  invitation_id?: string;
}

interface Filters {
  statuses: string[];
  missionsOperator: 'gte' | 'lte' | 'eq' | null;
  missionsValue: number | null;
  certificatesOperator: 'gte' | 'lte' | 'eq' | null;
  certificatesValue: number | null;
  dateOperator: 'before' | 'after' | null;
  dateValue: Date | null;
}

type SortField = 'name' | 'email' | 'status' | 'missions' | 'certificates' | 'lastParticipation' | null;
type SortDirection = 'asc' | 'desc';

const getStatusBadge = (status: string, isPending?: boolean) => {
  if (isPending) {
    return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 whitespace-nowrap">En attente</Badge>;
  }
  switch (status) {
    case 'registered':
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Inscrit</Badge>;
    case 'approved':
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Approuvé</Badge>;
    case 'attended':
      return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">Présent</Badge>;
    case 'waitlist':
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Liste d'attente</Badge>;
    case 'pending':
      return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">En attente</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export function PeopleTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>({
    statuses: [],
    missionsOperator: null,
    missionsValue: null,
    certificatesOperator: null,
    certificatesValue: null,
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
  const queryClient = useQueryClient();

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

  // Fetch pending invitations
  const { data: pendingInvitations } = useQuery({
    queryKey: ['organization-invitations', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'pending');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id
  });

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

  // Combine participants and pending invitations
  const allContributors = useMemo(() => {
    const contributors: Participant[] = [...(participants || [])];
    
    // Add pending invitations as contributors
    pendingInvitations?.forEach(invitation => {
      // Check if email is not already in participants
      const emailExists = contributors.some(p => p.email === invitation.email);
      if (!emailExists) {
        contributors.push({
          user_id: `invitation-${invitation.id}`,
          first_name: null,
          last_name: null,
          email: invitation.email,
          avatar_url: null,
          event_count: 0,
          tickets_scanned: 0,
          last_participation: invitation.created_at,
          last_status: 'pending',
          first_registered_at: invitation.created_at,
          is_pending_invitation: true,
          invitation_id: invitation.id,
        });
      }
    });
    
    return contributors;
  }, [participants, pendingInvitations]);

  // Resend invitation mutation
  const resendInvitation = useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          emails: [email],
          organizationName: organization?.name || 'Votre organisation',
          organizationId: organization?.id,
          invitedBy: currentUserId,
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Invitation renvoyée avec succès');
    },
    onError: (error) => {
      console.error('Error resending invitation:', error);
      toast.error('Erreur lors du renvoi de l\'invitation');
    }
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!participants) return { total: 0, engagementRate: 0, newThisMonth: 0, growthPercent: null, pendingCount: 0 };
    
    const total = participants.length;
    const pendingCount = pendingInvitations?.length || 0;
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
    
    return { total, engagementRate, newThisMonth, growthPercent, pendingCount };
  }, [participants, pendingInvitations]);

  // Get unique statuses
  const availableStatuses = useMemo(() => {
    if (!allContributors) return [];
    const statuses = [...new Set(allContributors.map(p => p.last_status))];
    if (!statuses.includes('pending') && (pendingInvitations?.length || 0) > 0) {
      statuses.push('pending');
    }
    return statuses;
  }, [allContributors, pendingInvitations]);

  // Filter and sort contributors
  const filteredParticipants = useMemo(() => {
    if (!allContributors) return [];
    
    let result = allContributors.filter(p => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
        const email = (p.email || '').toLowerCase();
        if (!fullName.includes(query) && !email.includes(query)) return false;
      }
      
      if (filters.statuses.length > 0 && !filters.statuses.includes(p.last_status)) return false;
      
      if (filters.missionsOperator && filters.missionsValue !== null) {
        if (filters.missionsOperator === 'gte' && p.event_count < filters.missionsValue) return false;
        if (filters.missionsOperator === 'lte' && p.event_count > filters.missionsValue) return false;
        if (filters.missionsOperator === 'eq' && p.event_count !== filters.missionsValue) return false;
      }
      
      if (filters.certificatesOperator && filters.certificatesValue !== null) {
        if (filters.certificatesOperator === 'gte' && p.tickets_scanned < filters.certificatesValue) return false;
        if (filters.certificatesOperator === 'lte' && p.tickets_scanned > filters.certificatesValue) return false;
        if (filters.certificatesOperator === 'eq' && p.tickets_scanned !== filters.certificatesValue) return false;
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
        let comparison = 0;
        
        switch (sortField) {
          case 'name':
            const aName = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
            const bName = `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase();
            comparison = aName.localeCompare(bName);
            break;
          case 'email':
            comparison = (a.email || '').localeCompare(b.email || '');
            break;
          case 'status':
            comparison = a.last_status.localeCompare(b.last_status);
            break;
          case 'missions':
            comparison = a.event_count - b.event_count;
            break;
          case 'certificates':
            comparison = a.tickets_scanned - b.tickets_scanned;
            break;
          case 'lastParticipation':
            comparison = new Date(a.last_participation).getTime() - new Date(b.last_participation).getTime();
            break;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    return result;
  }, [allContributors, searchQuery, filters, sortField, sortDirection]);

  const toggleSort = (field: SortField, direction?: SortDirection) => {
    if (direction) {
      setSortField(field);
      setSortDirection(direction);
    } else if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setFilters({
      statuses: [],
      missionsOperator: null,
      missionsValue: null,
      certificatesOperator: null,
      certificatesValue: null,
      dateOperator: null,
      dateValue: null,
    });
  };

  const hasActiveFilters = filters.statuses.length > 0 || filters.missionsOperator !== null || filters.certificatesOperator !== null || filters.dateOperator !== null;

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  const handleViewProfile = (participant: Participant) => {
    if (participant.is_pending_invitation) return;
    setSelectedContributor(participant);
    setProfilePanelOpen(true);
  };

  const handleContact = (participant: Participant) => {
    if (participant.is_pending_invitation) return;
    setContactContributor(participant);
    setContactDialogOpen(true);
  };

  const handleResendInvitation = (email: string) => {
    resendInvitation.mutate(email);
  };

  // Simple sortable column header (name & email - no filter dropdown)
  const SortableColumnHeader = ({ 
    label, 
    field, 
    className = ""
  }: { 
    label: string; 
    field: SortField;
    className?: string;
  }) => {
    const isActive = sortField === field;

    return (
      <button 
        onClick={() => toggleSort(field)}
        className={`flex items-center gap-1 hover:text-foreground transition-colors ${className}`}
      >
        <span className="whitespace-nowrap">{label}</span>
        {isActive && (
          sortDirection === 'asc' 
            ? <ChevronUp className="h-4 w-4" />
            : <ChevronDown className="h-4 w-4" />
        )}
      </button>
    );
  };

  // Column header with filter dropdown (shown on hover)
  const ColumnHeaderWithFilter = ({ 
    label, 
    field, 
    filterType,
    icon,
    className = ""
  }: { 
    label: string; 
    field: SortField;
    filterType?: 'status' | 'number' | 'date';
    icon?: React.ReactNode;
    className?: string;
  }) => {
    const isActive = sortField === field;
    const hasFilter = filterType === 'status' ? filters.statuses.length > 0 :
                     filterType === 'number' && field === 'missions' ? filters.missionsOperator !== null :
                     filterType === 'number' && field === 'certificates' ? filters.certificatesOperator !== null :
                     filterType === 'date' ? filters.dateOperator !== null : false;

    return (
      <div className={`flex items-center gap-1 group ${className}`}>
        {icon}
        <span className="whitespace-nowrap">{label}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`h-5 w-5 ml-0.5 ${isActive || hasFilter ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
            >
              <MoreVertical className={`h-3.5 w-3.5 ${isActive || hasFilter ? 'text-primary' : 'text-muted-foreground'}`} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Trier</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => toggleSort(field, 'asc')}>
              <ArrowUp className="h-4 w-4 mr-2" />
              Croissant
              {sortField === field && sortDirection === 'asc' && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleSort(field, 'desc')}>
              <ArrowDown className="h-4 w-4 mr-2" />
              Décroissant
              {sortField === field && sortDirection === 'desc' && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            
            {filterType && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Filtrer</DropdownMenuLabel>
                
                {filterType === 'status' && (
                  <div className="p-2 space-y-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start text-xs h-7"
                      onClick={() => setFilters(prev => ({ ...prev, statuses: [] }))}
                    >
                      Réinitialiser
                    </Button>
                    {availableStatuses.map(status => {
                      const isSelected = filters.statuses.includes(status);
                      const statusLabel = status === 'registered' ? 'Inscrit' :
                         status === 'approved' ? 'Approuvé' :
                         status === 'attended' ? 'Présent' :
                         status === 'waitlist' ? 'Liste d\'attente' :
                         status === 'pending' ? 'En attente' : status;
                      return (
                        <div 
                          key={status} 
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer"
                          onClick={() => {
                            setFilters(prev => ({
                              ...prev,
                              statuses: isSelected 
                                ? prev.statuses.filter(s => s !== status)
                                : [...prev.statuses, status]
                            }));
                          }}
                        >
                          <div className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                            {isSelected && <span className="text-primary-foreground text-xs">✓</span>}
                          </div>
                          <span className="text-sm">{statusLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {filterType === 'number' && field === 'missions' && (
                  <div className="p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <Select 
                      value={filters.missionsOperator || '_none'} 
                      onValueChange={(v) => setFilters(prev => ({ 
                        ...prev, 
                        missionsOperator: v === '_none' ? null : v as 'gte' | 'lte' | 'eq',
                        missionsValue: v === '_none' ? null : prev.missionsValue
                      }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Opérateur" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Aucun</SelectItem>
                        <SelectItem value="eq">= Égal à</SelectItem>
                        <SelectItem value="gte">≥ Plus grand que</SelectItem>
                        <SelectItem value="lte">≤ Plus petit que</SelectItem>
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
                      className="h-8"
                      disabled={filters.missionsOperator === null}
                    />
                  </div>
                )}
                
                {filterType === 'number' && field === 'certificates' && (
                  <div className="p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <Select 
                      value={filters.certificatesOperator || '_none'} 
                      onValueChange={(v) => setFilters(prev => ({ 
                        ...prev, 
                        certificatesOperator: v === '_none' ? null : v as 'gte' | 'lte' | 'eq',
                        certificatesValue: v === '_none' ? null : prev.certificatesValue
                      }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Opérateur" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Aucun</SelectItem>
                        <SelectItem value="eq">= Égal à</SelectItem>
                        <SelectItem value="gte">≥ Plus grand que</SelectItem>
                        <SelectItem value="lte">≤ Plus petit que</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input 
                      type="number" 
                      placeholder="Valeur"
                      value={filters.certificatesValue ?? ''}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        certificatesValue: e.target.value ? parseInt(e.target.value) : null 
                      }))}
                      className="h-8"
                      disabled={filters.certificatesOperator === null}
                    />
                  </div>
                )}
                
                {filterType === 'date' && (
                  <div className="p-2 space-y-2">
                    <Select 
                      value={filters.dateOperator || '_none'} 
                      onValueChange={(v) => setFilters(prev => ({ ...prev, dateOperator: v === '_none' ? null : v as 'before' | 'after' }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Opérateur" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Aucun</SelectItem>
                        <SelectItem value="before">Avant</SelectItem>
                        <SelectItem value="after">Après</SelectItem>
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal h-8">
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
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-transparent">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total contributeurs</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold">{kpis.total}</p>
                {kpis.pendingCount > 0 && (
                  <span className="text-sm text-amber-600 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    +{kpis.pendingCount} en attente
                  </span>
                )}
              </div>
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
            <Award className="h-8 w-8 text-muted-foreground/50" />
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

      {/* Search and Actions Bar - Sticky */}
      <div className="sticky top-16 md:top-28 z-20 bg-background pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par nom ou email..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="pl-10 bg-muted border-0" 
            />
          </div>
          
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <Filter className="h-4 w-4 mr-2" />
                Effacer les filtres
              </Button>
            )}
            <Button onClick={() => setInviteDialogOpen(true)} className="shrink-0">
              <UserPlus className="h-4 w-4 mr-2" />
              Inviter des bénévoles
            </Button>
          </div>
        </div>
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
              <Avatar className={`h-12 w-12 flex-shrink-0 ${participant.is_pending_invitation ? 'opacity-40' : ''}`}>
                <AvatarImage src={participant.avatar_url || undefined} />
                <AvatarFallback className={participant.is_pending_invitation ? 'bg-muted text-muted-foreground' : ''}>
                  {participant.is_pending_invitation ? <Clock className="h-5 w-5" /> : getInitials(participant.first_name, participant.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className={`font-medium text-sm truncate ${participant.is_pending_invitation ? 'text-muted-foreground italic' : ''}`}>
                      {participant.is_pending_invitation
                        ? 'Invitation en attente'
                        : participant.first_name && participant.last_name 
                          ? `${participant.first_name} ${participant.last_name}` 
                          : 'Nom non renseigné'}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {participant.email || 'Email non renseigné'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(participant.last_status, participant.is_pending_invitation)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {participant.is_pending_invitation ? (
                          <DropdownMenuItem 
                            onClick={() => handleResendInvitation(participant.email!)}
                            disabled={resendInvitation.isPending}
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${resendInvitation.isPending ? 'animate-spin' : ''}`} />
                            Renvoyer l'invitation
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => handleViewProfile(participant)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Voir le profil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleContact(participant)}>
                              <Mail className="h-4 w-4 mr-2" />
                              Contacter
                            </DropdownMenuItem>
                          </>
                        )}
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
                    <Award className="h-3 w-3" />
                    {participant.tickets_scanned} certificat{participant.tickets_scanned > 1 ? 's' : ''}
                  </span>
                  {!participant.is_pending_invitation && (
                    <span>
                      {format(new Date(participant.last_participation), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Desktop: Table view
        <div className="border rounded-lg overflow-hidden w-full max-w-[1400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="min-w-[140px] w-[20%]">
                  <SortableColumnHeader label="Nom" field="name" />
                </TableHead>
                <TableHead className="min-w-[180px] w-[25%]">
                  <SortableColumnHeader label="e-mail" field="email" />
                </TableHead>
                <TableHead className="w-[110px] pl-6">
                  <ColumnHeaderWithFilter label="Statut" field="status" filterType="status" />
                </TableHead>
                <TableHead className="w-[60px] text-left">
                  <ColumnHeaderWithFilter label="Missions" field="missions" filterType="number" />
                </TableHead>
                <TableHead className="w-[60px] text-left">
                  <ColumnHeaderWithFilter 
                    label="Certif." 
                    field="certificates" 
                    filterType="number" 
                    icon={<Award className="h-3.5 w-3.5" />}
                  />
                </TableHead>
                <TableHead className="w-[90px] text-left">
                  <ColumnHeaderWithFilter 
                    label="Dern. part." 
                    field="lastParticipation" 
                    filterType="date"
                  />
                </TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.map(participant => (
                <TableRow key={participant.user_id}>
                  <TableCell className="py-2">
                    <Avatar className={`h-8 w-8 ${participant.is_pending_invitation ? 'opacity-40' : ''}`}>
                      <AvatarImage src={participant.avatar_url || undefined} />
                      <AvatarFallback className={participant.is_pending_invitation ? 'bg-muted text-muted-foreground' : ''}>
                        {participant.is_pending_invitation ? <Clock className="h-3.5 w-3.5" /> : getInitials(participant.first_name, participant.last_name)}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className={`py-2 font-medium ${participant.is_pending_invitation ? 'text-muted-foreground italic' : ''}`}>
                    <span className="block truncate max-w-[200px]">
                      {participant.is_pending_invitation
                        ? '—'
                        : participant.first_name && participant.last_name 
                          ? `${participant.first_name} ${participant.last_name}` 
                          : 'Non renseigné'}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 text-muted-foreground">
                    <span className="block truncate max-w-[250px]">
                      {participant.email || 'Non renseigné'}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 pl-6">
                    {getStatusBadge(participant.last_status, participant.is_pending_invitation)}
                  </TableCell>
                  <TableCell className="py-2 font-medium text-left">
                    {participant.is_pending_invitation ? '—' : participant.event_count}
                  </TableCell>
                  <TableCell className="py-2 font-medium text-left">
                    {participant.is_pending_invitation ? '—' : participant.tickets_scanned}
                  </TableCell>
                  <TableCell className="py-2 text-muted-foreground text-sm text-left">
                    {participant.is_pending_invitation 
                      ? '—'
                      : format(new Date(participant.last_participation), 'dd/MM/yy', { locale: fr })}
                  </TableCell>
                  <TableCell className="py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {participant.is_pending_invitation ? (
                          <DropdownMenuItem 
                            onClick={() => handleResendInvitation(participant.email!)}
                            disabled={resendInvitation.isPending}
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${resendInvitation.isPending ? 'animate-spin' : ''}`} />
                            Renvoyer l'invitation
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => handleViewProfile(participant)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Voir le profil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleContact(participant)}>
                              <Mail className="h-4 w-4 mr-2" />
                              Contacter
                            </DropdownMenuItem>
                          </>
                        )}
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
