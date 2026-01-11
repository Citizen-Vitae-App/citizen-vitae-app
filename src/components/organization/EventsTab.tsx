import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Calendar as CalendarIcon,
  Users,
  Globe,
  Lock,
  QrCode,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  Edit,
  Trash2,
  Copy,
  TrendingUp,
  Activity,
  Tag,
} from "lucide-react";
import { useOrganizationEvents } from "@/hooks/useEvents";
import { useEventsParticipantCounts } from "@/hooks/useEventParticipants";
import { format, isAfter, isBefore, parseISO, isSameDay, startOfMonth, endOfMonth, subMonths, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import defaultEventCover from "@/assets/default-event-cover.jpg";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ColumnHeaderWithFilter,
  EventFilters,
  SortField,
  SortDirection,
  FilterPanelType,
} from "./ColumnHeaderWithFilter";
import { RecurrenceScopeDialog, RecurrenceScope } from "@/components/RecurrenceScopeDialog";
import { useRecentlyModifiedEvents } from "@/hooks/useRecentlyModifiedEvents";
const getEventStatus = (startDate: string, endDate: string) => {
  const now = new Date();
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (isBefore(end, now)) {
    return "Passé";
  }
  if (isAfter(start, now)) {
    return "À venir";
  }
  return "En cours";
};
const getStatusBadge = (status: string) => {
  switch (status) {
    case "Draft":
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 whitespace-nowrap">
          Draft
        </Badge>
      );
    case "À venir":
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 whitespace-nowrap">
          À venir
        </Badge>
      );
    case "En cours":
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 whitespace-nowrap">
          En cours
        </Badge>
      );
    case "Passé":
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300 whitespace-nowrap">
          Passé
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="whitespace-nowrap">
          {status}
        </Badge>
      );
  }
};
const getVisibilityBadge = (isPublic: boolean | null) => {
  const isActuallyPublic = isPublic ?? true;
  if (isActuallyPublic) {
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
        <Globe className="h-3 w-3 mr-1" />
        Public
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
      <Lock className="h-3 w-3 mr-1" />
      Privé
    </Badge>
  );
};
const getInitials = (firstName: string | null, lastName: string | null) => {
  const first = firstName?.[0] || "";
  const last = lastName?.[0] || "";
  return `${first}${last}`.toUpperCase() || "?";
};
const formatMobileEventDate = (startDate: string, endDate: string) => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (isSameDay(start, end)) {
    return format(start, "d MMM yyyy 'à' HH:mm", {
      locale: fr,
    });
  }
  const startFormatted = format(start, "d MMM 'à' HH:mm", {
    locale: fr,
  });
  const endFormatted = format(end, "d MMM yyyy 'à' HH:mm", {
    locale: fr,
  });
  return `Du ${startFormatted} au ${endFormatted}`;
};
const getCapacityProgressColor = (participantCount: number, capacity: number) => {
  const ratio = participantCount / capacity;
  if (ratio >= 0.75) return "bg-green-500";
  if (ratio >= 0.5) return "bg-orange-500";
  return "bg-red-500";
};
interface EventsTabProps {
  userTeamId?: string;
  canManageAllEvents?: boolean;
  isMember?: boolean;
}
export function EventsTab({ userTeamId, canManageAllEvents = true, isMember = false }: EventsTabProps) {
  // Debug log
  console.log("EventsTab received:", {
    userTeamId,
    canManageAllEvents,
    isMember,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<EventFilters>({
    statuses: [],
    visibilities: [],
    participantsOperator: null,
    participantsValue: null,
    dateOperator: null,
    dateValue: null,
    dateEndValue: null,
  });
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [recurrenceDialogEvent, setRecurrenceDialogEvent] = useState<{
    id: string;
    recurrence_group_id: string | null;
    start_date: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openFilterPanel, setOpenFilterPanel] = useState<FilterPanelType>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Recent events feedback
  const { isEventRecent, clearAll: clearRecentEvents } = useRecentlyModifiedEvents();

  // Clear recent highlights after component mounts (so they show once, then disappear on next visit)
  useEffect(() => {
    const timer = setTimeout(() => {
      clearRecentEvents();
    }, 500000); // Clear after 500 seconds
    return () => clearTimeout(timer);
  }, [clearRecentEvents]);

  // Debug log for hook call
  console.log("Calling useOrganizationEvents with teamId:", userTeamId);
  const { events: allEvents, isLoading, error, organizationId } = useOrganizationEvents(undefined, userTeamId);

  // Debug log for events result
  console.log("Events received:", allEvents?.length, "events");

  // Get all event IDs for participant counts
  const eventIds = useMemo(() => allEvents.map((e) => e.id), [allEvents]);
  const { data: participantCounts } = useEventsParticipantCounts(eventIds);

  // Fetch cause themes for events - only for THIS organization's events
  const { data: eventCauseThemes } = useQuery({
    queryKey: ["event-cause-themes", organizationId, eventIds],
    queryFn: async () => {
      if (!organizationId || eventIds.length === 0) return [];
      const { data, error } = await supabase
        .from("event_cause_themes")
        .select(
          `
          event_id,
          cause_themes:cause_theme_id(id, name, color, icon)
        `,
        )
        .in("event_id", eventIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && eventIds.length > 0,
    // Return empty array when disabled to avoid stale data
    placeholderData: [],
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!allEvents)
      return {
        newThisMonth: 0,
        growthPercent: null,
        topCause: null,
        activeMissions: 0,
      };
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const sevenDaysFromNow = addDays(now, 7);

    // New missions this month
    const newThisMonth = allEvents.filter((e) => {
      const date = new Date(e.created_at);
      return date >= thisMonthStart && date <= thisMonthEnd;
    }).length;
    const newLastMonth = allEvents.filter((e) => {
      const date = new Date(e.created_at);
      return date >= lastMonthStart && date <= lastMonthEnd;
    }).length;
    const growthPercent =
      newLastMonth > 0
        ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
        : newThisMonth > 0
          ? 100
          : null;

    // Active missions (en cours ou dans les 7 jours)
    const activeMissions = allEvents.filter((e) => {
      const start = parseISO(e.start_date);
      const end = parseISO(e.end_date);
      const isLive = start <= now && end >= now;
      const isUpcomingWithin7Days = start > now && start <= sevenDaysFromNow;
      return isLive || isUpcomingWithin7Days;
    }).length;

    // Top cause
    let topCause: {
      name: string;
      count: number;
      color: string;
    } | null = null;
    if (eventCauseThemes && eventCauseThemes.length > 0) {
      const causeCount = new Map<
        string,
        {
          name: string;
          count: number;
          color: string;
        }
      >();
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
              color: ect.cause_themes.color,
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
    return {
      newThisMonth,
      growthPercent,
      topCause,
      activeMissions,
    };
  }, [allEvents, eventCauseThemes]);

  // Client-side filtering
  const filteredEvents = useMemo(() => {
    if (!allEvents) return [];
    let result = allEvents.filter((event) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!event.name.toLowerCase().includes(query) && !event.location.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Status filter
      if (filters.statuses.length > 0) {
        const status = getEventStatus(event.start_date, event.end_date);
        if (!filters.statuses.includes(status)) return false;
      }

      // Visibility filter - use consistent logic (null = public)
      if (filters.visibilities.length > 0) {
        const isPublic = event.is_public ?? true;
        const visibility = isPublic ? "public" : "private";
        if (!filters.visibilities.includes(visibility)) return false;
      }

      // Participants filter
      if (filters.participantsOperator && filters.participantsValue !== null) {
        const count = participantCounts?.get(event.id)?.count || 0;
        if (filters.participantsOperator === "gte" && count < filters.participantsValue) return false;
        if (filters.participantsOperator === "lte" && count > filters.participantsValue) return false;
        if (filters.participantsOperator === "eq" && count !== filters.participantsValue) return false;
      }

      // Date filter
      if (filters.dateOperator && filters.dateValue) {
        const eventDate = parseISO(event.start_date);
        if (filters.dateOperator === "after" && !isAfter(eventDate, filters.dateValue)) return false;
        if (filters.dateOperator === "before" && !isBefore(eventDate, filters.dateValue)) return false;
        if (filters.dateOperator === "range" && filters.dateEndValue) {
          if (isBefore(eventDate, filters.dateValue) || isAfter(eventDate, filters.dateEndValue)) return false;
        }
      }
      return true;
    });

    // Sorting
    if (sortField) {
      result = [...result].sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case "title":
            comparison = a.name.localeCompare(b.name);
            break;
          case "date":
            comparison = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
            break;
          case "status":
            comparison = getEventStatus(a.start_date, a.end_date).localeCompare(
              getEventStatus(b.start_date, b.end_date),
            );
            break;
          case "visibility":
            comparison = ((a.is_public ?? true) ? 1 : 0) - ((b.is_public ?? true) ? 1 : 0);
            break;
          case "location":
            comparison = a.location.localeCompare(b.location);
            break;
          case "participants":
            const countA = participantCounts?.get(a.id)?.count || 0;
            const countB = participantCounts?.get(b.id)?.count || 0;
            comparison = countA - countB;
            break;
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }
    return result;
  }, [allEvents, searchQuery, filters, sortField, sortDirection, participantCounts]);
  const toggleSort = (field: SortField, direction?: SortDirection) => {
    if (direction) {
      setSortField(field);
      setSortDirection(direction);
    } else if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  const clearFilters = () => {
    setFilters({
      statuses: [],
      visibilities: [],
      participantsOperator: null,
      participantsValue: null,
      dateOperator: null,
      dateValue: null,
      dateEndValue: null,
    });
  };
  const hasActiveFilters =
    filters.statuses.length > 0 ||
    filters.visibilities.length > 0 ||
    filters.participantsOperator !== null ||
    filters.dateOperator !== null;

  // Event actions
  const handleDeleteClick = (event: any) => {
    if (event.recurrence_group_id) {
      setRecurrenceDialogEvent({
        id: event.id,
        recurrence_group_id: event.recurrence_group_id,
        start_date: event.start_date,
      });
    } else {
      setDeleteEventId(event.id);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventId) return;

    // Optimistic update: immediately remove from cache
    queryClient.setQueryData(
      ["organization-events", organizationId, userTeamId, undefined],
      (oldData: any[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter((event) => event.id !== deleteEventId);
      },
    );

    setDeleteEventId(null);
    toast.success("Événement supprimé");

    // Perform actual deletion in background
    const { error } = await supabase.from("events").delete().eq("id", deleteEventId);
    if (error) {
      // Revert on error - refetch to get correct state
      queryClient.invalidateQueries({ queryKey: ["organization-events", organizationId] });
      toast.error("Erreur lors de la suppression");
      console.error(error);
    }
  };

  const handleRecurrenceDeleteConfirm = async (scope: RecurrenceScope) => {
    if (!recurrenceDialogEvent) return;

    // Calculate which events will be deleted for optimistic update
    const eventId = recurrenceDialogEvent.id;
    const groupId = recurrenceDialogEvent.recurrence_group_id;
    const startDate = recurrenceDialogEvent.start_date;

    // Optimistic update
    queryClient.setQueryData(
      ["organization-events", organizationId, userTeamId, undefined],
      (oldData: any[] | undefined) => {
        if (!oldData) return oldData;

        if (scope === "this_only") {
          return oldData.filter((event) => event.id !== eventId);
        } else if (scope === "this_and_following") {
          return oldData.filter((event) => {
            if (event.recurrence_group_id !== groupId) return true;
            return event.start_date < startDate;
          });
        } else if (scope === "all") {
          return oldData.filter((event) => event.recurrence_group_id !== groupId);
        }
        return oldData;
      },
    );

    setRecurrenceDialogEvent(null);
    toast.success(
      scope === "this_only"
        ? "Événement supprimé"
        : scope === "this_and_following"
          ? "Événements supprimés"
          : "Série d'événements supprimée",
    );

    setIsDeleting(true);
    try {
      if (scope === "this_only") {
        const { error } = await supabase.from("events").delete().eq("id", eventId);
        if (error) throw error;
      } else if (scope === "this_and_following") {
        const { error } = await supabase
          .from("events")
          .delete()
          .eq("recurrence_group_id", groupId)
          .gte("start_date", startDate);
        if (error) throw error;
      } else if (scope === "all") {
        const { error } = await supabase.from("events").delete().eq("recurrence_group_id", groupId);
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error deleting events:", error);
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ["organization-events", organizationId] });
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };
  const handleDuplicateEvent = async (event: any) => {
    const { data: newEvent, error } = await supabase
      .from("events")
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
      toast.error("Erreur lors de la duplication");
      console.error(error);
    } else if (newEvent) {
      toast.success("Événement dupliqué");
      navigate(`/organization/events/${newEvent.id}/edit`);
    }
  };

  // Sortable column header (no filter)
  const SortableColumnHeader = ({ label, field }: { label: string; field: SortField }) => {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => toggleSort(field)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <span className="whitespace-nowrap">{label}</span>
        {isActive &&
          (sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
      </button>
    );
  };

  // SAFETY LAYER: Show skeleton while organization context is resolving
  // This prevents flash of stale/other organization's data
  if (isLoading || !organizationId) {
    return (
      <div className="space-y-4 md:space-y-6">
        {/* KPI Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-transparent animate-pulse">
              <div className="h-4 bg-muted rounded w-32 mb-2"></div>
              <div className="h-8 bg-muted rounded w-16"></div>
            </div>
          ))}
        </div>
        {/* Table Skeleton */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-12 w-16 bg-muted rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-48"></div>
                  <div className="h-3 bg-muted rounded w-32"></div>
                </div>
                <div className="h-6 bg-muted rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return <div className="text-center py-12 text-destructive">Erreur lors du chargement des événements</div>;
  }
  return (
    <div className="space-y-4 md:space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Nouvelles missions ce mois</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold">{kpis.newThisMonth}</p>
                {kpis.growthPercent !== null && (
                  <span
                    className={`text-sm font-medium flex items-center gap-0.5 ${kpis.growthPercent >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    <TrendingUp className={`h-3.5 w-3.5 ${kpis.growthPercent < 0 ? "rotate-180" : ""}`} />
                    {kpis.growthPercent >= 0 ? "+" : ""}
                    {kpis.growthPercent}%
                  </span>
                )}
              </div>
            </div>
            <CalendarIcon className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-white">
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

        <div className="p-4 rounded-xl border border-border bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Missions actives</p>
              <p className="text-2xl font-bold mt-1">{kpis.activeMissions}</p>
            </div>
            <Activity className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </div>
      </div>

      {/* Search and Actions Bar - Sticky */}
      <div className="sticky top-0 z-20 bg-background py-3 -mx-4 px-4 md:mx-0 md:px-0 md:top-28">
        <div className="flex items-center gap-2">
          {/* Search bar - flexible width */}
          <div className="relative flex-1 min-w-0 md:w-72 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un événement..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted border-0 h-10"
            />
          </div>

          {/* Clear filters button - desktop only */}
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="hidden md:flex">
              Effacer les filtres
            </Button>
          )}

          {/* Hide action buttons for regular members - they can only view */}
          {!isMember && (
            <>
              <Button asChild variant="outline" size="icon" className="h-10 w-10 shrink-0 md:w-auto md:px-4">
                <Link to="/organization/scan">
                  <QrCode className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Scanner</span>
                </Link>
              </Button>
              <Button asChild size="icon" className="h-10 w-10 shrink-0 md:w-auto md:px-4">
                <Link to="/organization/create-event">
                  <Plus className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Créer</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Events list */}
      <div className="w-full">
        {filteredEvents.length === 0 ? (
          <div className="border rounded-lg overflow-hidden w-full">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold w-[35%]">
                    <SortableColumnHeader label="Titre" field="title" />
                  </TableHead>
                  <TableHead className="font-semibold w-[14%]">
                    <ColumnHeaderWithFilter
                      label="Date"
                      field="date"
                      filterType="date"
                      icon={<CalendarIcon className="h-4 w-4" />}
                      filters={filters}
                      setFilters={setFilters}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      toggleSort={toggleSort}
                      openFilterPanel={openFilterPanel}
                      setOpenFilterPanel={setOpenFilterPanel}
                    />
                  </TableHead>
                  <TableHead className="font-semibold w-[10%]">
                    <ColumnHeaderWithFilter
                      label="Statut"
                      field="status"
                      filterType="status"
                      filters={filters}
                      setFilters={setFilters}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      toggleSort={toggleSort}
                      openFilterPanel={openFilterPanel}
                      setOpenFilterPanel={setOpenFilterPanel}
                    />
                  </TableHead>
                  <TableHead className="font-semibold w-[10%]">
                    <ColumnHeaderWithFilter
                      label="Visibilité"
                      field="visibility"
                      filterType="visibility"
                      filters={filters}
                      setFilters={setFilters}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      toggleSort={toggleSort}
                      openFilterPanel={openFilterPanel}
                      setOpenFilterPanel={setOpenFilterPanel}
                    />
                  </TableHead>
                  <TableHead className="font-semibold w-[18%]">
                    <SortableColumnHeader label="Lieu" field="location" />
                  </TableHead>
                  <TableHead className="font-semibold w-[10%]">
                    <ColumnHeaderWithFilter
                      label="Part."
                      field="participants"
                      filterType="participants"
                      icon={<Users className="h-4 w-4" />}
                      filters={filters}
                      setFilters={setFilters}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      toggleSort={toggleSort}
                      openFilterPanel={openFilterPanel}
                      setOpenFilterPanel={setOpenFilterPanel}
                    />
                  </TableHead>
                  <TableHead className="w-[5%]"></TableHead>
                </TableRow>
              </TableHeader>
            </Table>
            <div className="text-center py-12">
              <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Aucun événement</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || hasActiveFilters
                  ? "Aucun événement ne correspond à vos critères"
                  : "Créez votre premier événement pour commencer"}
              </p>
              {!searchQuery && !hasActiveFilters && !isMember && (
                <Button asChild>
                  <Link to="/organization/create-event">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un événement
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ) : isMobile ? (
          // Mobile: Card list view
          <div className="space-y-3">
            {filteredEvents.map((event) => {
              const status = getEventStatus(event.start_date, event.end_date);
              const eventParticipants = participantCounts?.get(event.id);
              const participantCount = eventParticipants?.count || 0;
              const capacity = event.capacity;
              const isRecent = isEventRecent(event.id, event.recurrence_group_id);
              return (
                <div
                  key={event.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300 ease-out ${
                    isRecent ? "bg-blue-50 hover:bg-blue-100/80" : "bg-muted/30 hover:bg-muted/50"
                  }`}
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
                      {getVisibilityBadge(event.is_public)}
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
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/organization/events/${event.id}/edit`);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateEvent(event);
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Dupliquer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(event);
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
          <div className="border rounded-lg overflow-auto w-full max-h-[calc(100vh-280px)]">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="sticky top-0 z-10 bg-background font-semibold w-[35%]">
                    <SortableColumnHeader label="Titre" field="title" />
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background font-semibold w-[14%]">
                    <ColumnHeaderWithFilter
                      label="Date"
                      field="date"
                      filterType="date"
                      icon={<CalendarIcon className="h-4 w-4" />}
                      filters={filters}
                      setFilters={setFilters}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      toggleSort={toggleSort}
                      openFilterPanel={openFilterPanel}
                      setOpenFilterPanel={setOpenFilterPanel}
                    />
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background font-semibold w-[10%]">
                    <ColumnHeaderWithFilter
                      label="Statut"
                      field="status"
                      filterType="status"
                      filters={filters}
                      setFilters={setFilters}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      toggleSort={toggleSort}
                      openFilterPanel={openFilterPanel}
                      setOpenFilterPanel={setOpenFilterPanel}
                    />
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background font-semibold w-[10%]">
                    <ColumnHeaderWithFilter
                      label="Visibilité"
                      field="visibility"
                      filterType="visibility"
                      filters={filters}
                      setFilters={setFilters}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      toggleSort={toggleSort}
                      openFilterPanel={openFilterPanel}
                      setOpenFilterPanel={setOpenFilterPanel}
                    />
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background font-semibold w-[18%]">
                    <SortableColumnHeader label="Lieu" field="location" />
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background font-semibold w-[10%]">
                    <ColumnHeaderWithFilter
                      label="Participants"
                      field="participants"
                      filterType="participants"
                      icon={<Users className="h-4 w-4" />}
                      filters={filters}
                      setFilters={setFilters}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      toggleSort={toggleSort}
                      openFilterPanel={openFilterPanel}
                      setOpenFilterPanel={setOpenFilterPanel}
                    />
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-background w-[5%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => {
                  const status = getEventStatus(event.start_date, event.end_date);
                  const eventParticipants = participantCounts?.get(event.id);
                  const participantCount = eventParticipants?.count || 0;
                  const participants = eventParticipants?.participants || [];
                  const capacity = event.capacity;
                  const fillRatio = capacity ? (participantCount / capacity) * 100 : null;
                  const isRecent = isEventRecent(event.id, event.recurrence_group_id);
                  return (
                    <TableRow
                      key={event.id}
                      className={`cursor-pointer transition-all duration-300 ease-out ${
                        isRecent ? "bg-blue-50 hover:bg-blue-100/80" : "hover:bg-muted/50"
                      }`}
                      onClick={() => navigate(`/organization/events/${event.id}/edit`)}
                    >
                      <TableCell className="py-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={event.cover_image_url || defaultEventCover}
                            alt={event.name}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                          <span className="font-medium truncate" title={event.name}>
                            {event.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-sm whitespace-nowrap">
                          {format(parseISO(event.start_date), "dd/MM/yy HH'h'mm")}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">{getStatusBadge(status)}</TableCell>
                      <TableCell className="py-2">{getVisibilityBadge(event.is_public)}</TableCell>
                      <TableCell className="py-2">
                        <span className="truncate block max-w-full" title={event.location}>
                          {event.location}
                        </span>
                      </TableCell>
                      <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                        <HoverCard openDelay={200}>
                          <HoverCardTrigger asChild>
                            <div className="space-y-1">
                              <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                                <span className="font-medium text-foreground">{participantCount}</span>
                                {capacity && <span className="text-muted-foreground">/ {capacity}</span>}
                              </button>
                              {capacity && fillRatio !== null && (
                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${getCapacityProgressColor(participantCount, capacity)}`}
                                    style={{
                                      width: `${Math.min(fillRatio, 100)}%`,
                                    }}
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
                                {participants.slice(0, 5).map((participant) => (
                                  <div
                                    key={participant.user_id}
                                    className="flex items-center gap-3 p-3 border-b border-border last:border-0"
                                  >
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
                                          : "Nom non renseigné"}
                                      </p>
                                      <p className="text-xs text-muted-foreground truncate">{participant.email}</p>
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
                      <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
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
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(event)}>
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
          </div>
        )}
      </div>

      {/* Delete confirmation dialog for non-recurring events */}
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
            <AlertDialogAction
              onClick={handleDeleteEvent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recurrence scope dialog for recurring events */}
      <RecurrenceScopeDialog
        isOpen={!!recurrenceDialogEvent}
        onClose={() => setRecurrenceDialogEvent(null)}
        onConfirm={handleRecurrenceDeleteConfirm}
        actionType="delete"
        eventDate={recurrenceDialogEvent ? parseISO(recurrenceDialogEvent.start_date) : undefined}
        isLoading={isDeleting}
      />
    </div>
  );
}
