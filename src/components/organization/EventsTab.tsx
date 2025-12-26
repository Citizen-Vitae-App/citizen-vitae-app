import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Calendar, 
  Users, 
  Globe, 
  Lock, 
  QrCode,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Edit,
  Trash2,
  Copy,
  TrendingUp,
  Activity,
  Tag
} from 'lucide-react';
import { useOrganizationEvents } from '@/hooks/useEvents';
import { useEventsParticipantCounts } from '@/hooks/useEventParticipants';
import { format, isAfter, isBefore, parseISO, isSameDay, startOfMonth, endOfMonth, subMonths, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import defaultEventCover from '@/assets/default-event-cover.jpg';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EventFilters {
  statuses: string[];
  visibilities: string[];
  participantsOperator: 'gte' | 'lte' | 'eq' | null;
  participantsValue: number | null;
}

type SortField = 'title' | 'status' | 'visibility' | 'location' | 'participants' | null;
type SortDirection = 'asc' | 'desc';

const getEventStatus = (startDate: string, endDate: string) => {
  const now = new Date();
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (isBefore(end, now)) {
    return 'Passé';
  }
  if (isAfter(start, now)) {
    return 'À venir';
  }
  return 'En cours';
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Draft':
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 whitespace-nowrap">Draft</Badge>;
    case 'À venir':
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 whitespace-nowrap">À venir</Badge>;
    case 'En cours':
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 whitespace-nowrap">En cours</Badge>;
    case 'Passé':
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300 whitespace-nowrap">Passé</Badge>;
    default:
      return <Badge variant="outline" className="whitespace-nowrap">{status}</Badge>;
  }
};

const getVisibilityBadge = (isPublic: boolean) => {
  if (isPublic) {
    return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
        <Globe className="h-3 w-3 mr-1" />
        Public
      </Badge>;
  }
  return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
      <Lock className="h-3 w-3 mr-1" />
      Privé
    </Badge>;
};

const getInitials = (firstName: string | null, lastName: string | null) => {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return `${first}${last}`.toUpperCase() || '?';
};

const formatMobileEventDate = (startDate: string, endDate: string) => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (isSameDay(start, end)) {
    return format(start, "d MMM yyyy 'à' HH:mm", {
      locale: fr
    });
  }

  const startFormatted = format(start, "d MMM 'à' HH:mm", {
    locale: fr
  });
  const endFormatted = format(end, "d MMM yyyy 'à' HH:mm", {
    locale: fr
  });
  return `Du ${startFormatted} au ${endFormatted}`;
};

const getCapacityProgressColor = (participantCount: number, capacity: number) => {
  const ratio = participantCount / capacity;
  if (ratio >= 0.75) return 'bg-green-500';
  if (ratio >= 0.5) return 'bg-orange-500';
  return 'bg-red-500';
};

export function EventsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<EventFilters>({
    statuses: [],
    visibilities: [],
    participantsOperator: null,
    participantsValue: null,
  });
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  const {
    events: allEvents,
    isLoading,
    error,
    organizationId
  } = useOrganizationEvents();

  // Get all event IDs for participant counts
  const eventIds = useMemo(() => allEvents.map(e => e.id), [allEvents]);
  const { data: participantCounts } = useEventsParticipantCounts(eventIds);

  // Fetch cause themes for events
  const { data: eventCauseThemes } = useQuery({
    queryKey: ['event-cause-themes', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('event_cause_themes')
        .select(`
          event_id,
          cause_themes:cause_theme_id(id, name, color, icon)
        `)
        .in('event_id', eventIds);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && eventIds.length > 0
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!allEvents) return { 
      newThisMonth: 0, 
      growthPercent: null, 
      topCause: null,
      activeMissions: 0 
    };
    
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const sevenDaysFromNow = addDays(now, 7);
    
    // New missions this month
    const newThisMonth = allEvents.filter(e => {
      const date = new Date(e.created_at);
      return date >= thisMonthStart && date <= thisMonthEnd;
    }).length;
    
    const newLastMonth = allEvents.filter(e => {
      const date = new Date(e.created_at);
      return date >= lastMonthStart && date <= lastMonthEnd;
    }).length;
    
    const growthPercent = newLastMonth > 0 
      ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
      : newThisMonth > 0 ? 100 : null;
    
    // Active missions (en cours ou dans les 7 jours)
    const activeMissions = allEvents.filter(e => {
      const start = parseISO(e.start_date);
      const end = parseISO(e.end_date);
      const isLive = start <= now && end >= now;
      const isUpcomingWithin7Days = start > now && start <= sevenDaysFromNow;
      return isLive || isUpcomingWithin7Days;
    }).length;
    
    // Top cause
    let topCause: { name: string; count: number; color: string } | null = null;
    if (eventCauseThemes && eventCauseThemes.length > 0) {
      const causeCount = new Map<string, { name: string; count: number; color: string }>();
      eventCauseThemes.forEach((ect: any) => {
        if (ect.cause_themes) {
          const id = ect.cause_themes.id;
          const existing = causeCount.get(id);
          if (existing) {
            existing.count++;
          } else {
            causeCount.set(id, {
              name: ect.cause_themes.name,
              count: 1,
              color: ect.cause_themes.color
            });
          }
        }
      });
      
      let maxCount = 0;
      causeCount.forEach((value) => {
        if (value.count > maxCount) {
          maxCount = value.count;
          topCause = value;
        }
      });
    }
    
    return { newThisMonth, growthPercent, topCause, activeMissions };
  }, [allEvents, eventCauseThemes]);

  // Client-side filtering
  const filteredEvents = useMemo(() => {
    if (!allEvents) return [];
    
    let result = allEvents.filter(event => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!event.name.toLowerCase().includes(query) && 
            !event.location.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Status filter
      if (filters.statuses.length > 0) {
        const status = getEventStatus(event.start_date, event.end_date);
        if (!filters.statuses.includes(status)) return false;
      }
      
      // Visibility filter
      if (filters.visibilities.length > 0) {
        const visibility = event.is_public ? 'public' : 'private';
        if (!filters.visibilities.includes(visibility)) return false;
      }
      
      // Participants filter
      if (filters.participantsOperator && filters.participantsValue !== null) {
        const count = participantCounts?.get(event.id)?.count || 0;
        if (filters.participantsOperator === 'gte' && count < filters.participantsValue) return false;
        if (filters.participantsOperator === 'lte' && count > filters.participantsValue) return false;
        if (filters.participantsOperator === 'eq' && count !== filters.participantsValue) return false;
      }
      
      return true;
    });
    
    // Sorting
    if (sortField) {
      result = [...result].sort((a, b) => {
        let comparison = 0;
        
        switch (sortField) {
          case 'title':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'status':
            comparison = getEventStatus(a.start_date, a.end_date).localeCompare(getEventStatus(b.start_date, b.end_date));
            break;
          case 'visibility':
            comparison = (a.is_public ? 1 : 0) - (b.is_public ? 1 : 0);
            break;
          case 'location':
            comparison = a.location.localeCompare(b.location);
            break;
          case 'participants':
            const countA = participantCounts?.get(a.id)?.count || 0;
            const countB = participantCounts?.get(b.id)?.count || 0;
            comparison = countA - countB;
            break;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    return result;
  }, [allEvents, searchQuery, filters, sortField, sortDirection, participantCounts]);

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
      visibilities: [],
      participantsOperator: null,
      participantsValue: null,
    });
  };

  const hasActiveFilters = filters.statuses.length > 0 || filters.visibilities.length > 0 || filters.participantsOperator !== null;

  // Event actions
  const handleDeleteEvent = async () => {
    if (!deleteEventId) return;
    
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', deleteEventId);
    
    if (error) {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    } else {
      toast.success('Événement supprimé');
    }
    setDeleteEventId(null);
  };

  const handleDuplicateEvent = async (event: any) => {
    const { data: newEvent, error } = await supabase
      .from('events')
      .insert({
        name: `Copie de ${event.name}`,
        description: event.description,
        location: event.location,
        latitude: event.latitude,
        longitude: event.longitude,
        start_date: event.start_date,
        end_date: event.end_date,
        is_public: event.is_public,
        capacity: event.capacity,
        require_approval: event.require_approval,
        has_waitlist: event.has_waitlist,
        allow_self_certification: event.allow_self_certification,
        cover_image_url: event.cover_image_url,
        organization_id: event.organization_id,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Erreur lors de la duplication');
      console.error(error);
    } else if (newEvent) {
      toast.success('Événement dupliqué');
      navigate(`/organization/events/${newEvent.id}/edit`);
    }
  };

  // Column header with filter dropdown
  const ColumnHeaderWithFilter = ({ 
    label, 
    field, 
    filterType,
    icon,
    className = ""
  }: { 
    label: string; 
    field: SortField;
    filterType?: 'status' | 'visibility' | 'number';
    icon?: React.ReactNode;
    className?: string;
  }) => {
    const isActive = sortField === field;
    const hasFilter = filterType === 'status' ? filters.statuses.length > 0 :
                     filterType === 'visibility' ? filters.visibilities.length > 0 :
                     filterType === 'number' ? filters.participantsOperator !== null : false;

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
                    {['À venir', 'En cours', 'Passé'].map(status => {
                      const isSelected = filters.statuses.includes(status);
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
                          <span className="text-sm">{status}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {filterType === 'visibility' && (
                  <div className="p-2 space-y-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start text-xs h-7"
                      onClick={() => setFilters(prev => ({ ...prev, visibilities: [] }))}
                    >
                      Réinitialiser
                    </Button>
                    {[{ value: 'public', label: 'Public' }, { value: 'private', label: 'Privé' }].map(({ value, label }) => {
                      const isSelected = filters.visibilities.includes(value);
                      return (
                        <div 
                          key={value} 
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer"
                          onClick={() => {
                            setFilters(prev => ({
                              ...prev,
                              visibilities: isSelected 
                                ? prev.visibilities.filter(s => s !== value)
                                : [...prev.visibilities, value]
                            }));
                          }}
                        >
                          <div className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                            {isSelected && <span className="text-primary-foreground text-xs">✓</span>}
                          </div>
                          <span className="text-sm">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {filterType === 'number' && (
                  <div className="p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <Select 
                      value={filters.participantsOperator || '_none'} 
                      onValueChange={(v) => setFilters(prev => ({ 
                        ...prev, 
                        participantsOperator: v === '_none' ? null : v as 'gte' | 'lte' | 'eq',
                        participantsValue: v === '_none' ? null : prev.participantsValue
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
                      value={filters.participantsValue ?? ''}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        participantsValue: e.target.value ? parseInt(e.target.value) : null 
                      }))}
                      className="h-8"
                      disabled={filters.participantsOperator === null}
                    />
                  </div>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  // Sortable column header (no filter)
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

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }

  if (error) {
    return <div className="text-center py-12 text-destructive">
        Erreur lors du chargement des événements
      </div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-transparent">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Nouvelles missions ce mois</p>
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
            <Calendar className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </div>
        
        <div className="p-4 rounded-xl border border-border bg-transparent">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Cause la plus présente</p>
              <div className="flex items-center gap-2 mt-1">
                {kpis.topCause ? (
                  <>
                    <p className="text-lg font-bold">{kpis.topCause.name}</p>
                    <span className="text-sm text-muted-foreground">({kpis.topCause.count})</span>
                  </>
                ) : (
                  <p className="text-lg text-muted-foreground">Aucune</p>
                )}
              </div>
            </div>
            <Tag className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </div>
        
        <div className="p-4 rounded-xl border border-border bg-transparent">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Missions actives</p>
              <p className="text-2xl font-bold mt-1">{kpis.activeMissions}</p>
            </div>
            <Activity className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </div>
      </div>

      {/* Search and Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un événement..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="pl-10 bg-muted border-0" 
          />
        </div>
        
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Effacer les filtres
            </Button>
          )}
          <Button asChild variant="outline" size={isMobile ? "sm" : "default"}>
            <Link to="/organization/scan">
              <QrCode className="mr-1 md:mr-2 h-4 w-4" />
              {isMobile ? "Scan" : "Scanner"}
            </Link>
          </Button>
          <Button asChild size={isMobile ? "sm" : "default"}>
            <Link to="/organization/create-event">
              <Plus className="mr-1 md:mr-2 h-4 w-4" />
              Créer
            </Link>
          </Button>
        </div>
      </div>

      {/* Events list */}
      <div className="w-full max-w-[1400px]">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Aucun événement</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || hasActiveFilters 
                ? 'Aucun événement ne correspond à vos critères' 
                : 'Créez votre premier événement pour commencer'}
            </p>
            {!searchQuery && !hasActiveFilters && (
              <Button asChild>
                <Link to="/organization/create-event">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un événement
                </Link>
              </Button>
            )}
          </div>
        ) : isMobile ? (
          // Mobile: Card list view
          <div className="space-y-3">
            {filteredEvents.map(event => {
              const status = getEventStatus(event.start_date, event.end_date);
              const eventParticipants = participantCounts?.get(event.id);
              const participantCount = eventParticipants?.count || 0;
              const capacity = event.capacity;
              
              return (
                <div 
                  key={event.id} 
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors" 
                  onClick={() => navigate(`/organization/events/${event.id}/edit`)}
                >
                  <img 
                    src={event.cover_image_url || defaultEventCover} 
                    alt={event.name} 
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0" 
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{event.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatMobileEventDate(event.start_date, event.end_date)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(status)}
                      {getVisibilityBadge(event.is_public ?? true)}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {participantCount}
                        {capacity && `/${capacity}`}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/organization/events/${event.id}/edit`);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateEvent(event);
                      }}>
                        <Copy className="h-4 w-4 mr-2" />
                        Dupliquer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteEventId(event.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        ) : (
          // Desktop: Table view
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="font-semibold w-[35%]">
                  <SortableColumnHeader label="Titre, date et heure" field="title" />
                </TableHead>
                <TableHead className="font-semibold w-[12%]">
                  <ColumnHeaderWithFilter label="Statut" field="status" filterType="status" />
                </TableHead>
                <TableHead className="font-semibold w-[12%]">
                  <ColumnHeaderWithFilter label="Visibilité" field="visibility" filterType="visibility" />
                </TableHead>
                <TableHead className="font-semibold w-[20%]">
                  <SortableColumnHeader label="Lieu" field="location" />
                </TableHead>
                <TableHead className="font-semibold w-[12%]">
                  <ColumnHeaderWithFilter 
                    label="Participants" 
                    field="participants" 
                    filterType="number"
                    icon={<Users className="h-4 w-4" />}
                  />
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map(event => {
                const status = getEventStatus(event.start_date, event.end_date);
                const eventParticipants = participantCounts?.get(event.id);
                const participantCount = eventParticipants?.count || 0;
                const participants = eventParticipants?.participants || [];
                const capacity = event.capacity;
                const fillRatio = capacity ? (participantCount / capacity) * 100 : null;
                
                return (
                  <TableRow 
                    key={event.id} 
                    className="cursor-pointer hover:bg-muted/50 border-0" 
                    onClick={() => navigate(`/organization/events/${event.id}/edit`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img 
                          src={event.cover_image_url || defaultEventCover} 
                          alt={event.name} 
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0" 
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate" title={event.name}>{event.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {format(parseISO(event.start_date), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(status)}</TableCell>
                    <TableCell>{getVisibilityBadge(event.is_public ?? true)}</TableCell>
                    <TableCell>
                      <span className="truncate block max-w-[200px]" title={event.location}>
                        {event.location}
                      </span>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <HoverCard openDelay={200}>
                        <HoverCardTrigger asChild>
                          <div className="space-y-1">
                            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                              <span className="font-medium text-foreground">{participantCount}</span>
                              {capacity && <span className="text-muted-foreground">/ {capacity}</span>}
                            </button>
                            {capacity && fillRatio !== null && (
                              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${getCapacityProgressColor(participantCount, capacity)}`}
                                  style={{ width: `${Math.min(fillRatio, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent align="start" className="w-72 p-0">
                          <div className="p-3 border-b border-border">
                            <h4 className="font-semibold text-sm">Participants inscrits</h4>
                          </div>
                          {participants.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              Aucun participant inscrit
                            </div>
                          ) : (
                            <div className="max-h-60 overflow-y-auto">
                              {participants.slice(0, 5).map(participant => (
                                <div key={participant.user_id} className="flex items-center gap-3 p-3 border-b border-border last:border-0">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={participant.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {getInitials(participant.first_name, participant.last_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {participant.first_name && participant.last_name 
                                        ? `${participant.first_name} ${participant.last_name}` 
                                        : 'Nom non renseigné'}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {participant.email}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {participants.length > 5 && (
                                <div className="p-3 text-center text-sm text-muted-foreground bg-muted/50">
                                  + {participants.length - 5} autres participants
                                </div>
                              )}
                            </div>
                          )}
                        </HoverCardContent>
                      </HoverCard>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/organization/events/${event.id}/edit`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Modifier l'événement
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateEvent(event)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Dupliquer l'événement
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeleteEventId(event.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer l'événement
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteEventId} onOpenChange={(open) => !open && setDeleteEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les inscriptions associées seront également supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
