import { useState, useRef, useCallback, useEffect, useImperativeHandle } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  is_public: boolean | null;
  organization_id: string;
  cover_image_url: string | null;
  capacity: number | null;
  recurrence_group_id: string | null;
}

export interface CalendarToolbarApi {
  handlePrev: () => void;
  handleNext: () => void;
  handleToday: () => void;
  handleViewChange: (view: CalendarViewType) => void;
}

interface EventCalendarViewProps {
  events: CalendarEvent[];
  organizationId: string;
  participantCounts?: Map<string, { count: number }>;
  isMember?: boolean;
  onToolbarReady?: (api: CalendarToolbarApi) => void;
  onStateChange?: (state: { currentView: CalendarViewType; currentTitle: string }) => void;
}

export type CalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

const VIEW_LABELS: Record<CalendarViewType, string> = {
  dayGridMonth: 'Mois',
  timeGridWeek: 'Semaine',
  timeGridDay: 'Jour',
};

export function EventCalendarView({ events, organizationId, participantCounts, isMember = false, onToolbarReady, onStateChange }: EventCalendarViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const calendarRef = useRef<FullCalendar>(null);
  const [currentView, setCurrentView] = useState<CalendarViewType>('dayGridMonth');
  const [currentTitle, setCurrentTitle] = useState('');

  // Convert events to FullCalendar format
  const calendarEvents = events.map(event => {
    const now = new Date();
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    const isPast = end < now;
    const isLive = start <= now && end >= now;

    return {
      id: event.id,
      title: event.name,
      start: event.start_date,
      end: event.end_date,
      extendedProps: {
        location: event.location,
        is_public: event.is_public,
        organization_id: event.organization_id,
        participantCount: participantCounts?.get(event.id)?.count || 0,
        capacity: event.capacity,
        isPast,
        isLive,
      },
      classNames: [
        isPast ? 'fc-event-past' : isLive ? 'fc-event-live' : 'fc-event-upcoming',
      ],
      editable: !isMember,
    };
  });

  // Handle event click
  const handleEventClick = useCallback((info: any) => {
    navigate(`/organization/events/${info.event.id}/edit`);
  }, [navigate]);

  // Handle event drag & drop (date change)
  const handleEventDrop = useCallback(async (info: any) => {
    const eventId = info.event.id;
    const newStart = info.event.start?.toISOString();
    const newEnd = info.event.end?.toISOString() || newStart;

    try {
      const { error } = await supabase
        .from('events')
        .update({ start_date: newStart, end_date: newEnd, updated_at: new Date().toISOString() })
        .eq('id', eventId);

      if (error) throw error;
      toast.success('Date mise à jour');
      queryClient.invalidateQueries({ queryKey: ['organization-events', organizationId] });
    } catch (err) {
      logger.error('Error updating event date:', err);
      toast.error('Erreur lors de la mise à jour');
      info.revert();
    }
  }, [organizationId, queryClient]);

  // Handle event resize (duration change)
  const handleEventResize = useCallback(async (info: any) => {
    const eventId = info.event.id;
    const newEnd = info.event.end?.toISOString();

    try {
      const { error } = await supabase
        .from('events')
        .update({ end_date: newEnd, updated_at: new Date().toISOString() })
        .eq('id', eventId);

      if (error) throw error;
      toast.success('Durée mise à jour');
      queryClient.invalidateQueries({ queryKey: ['organization-events', organizationId] });
    } catch (err) {
      logger.error('Error updating event duration:', err);
      toast.error('Erreur lors de la mise à jour');
      info.revert();
    }
  }, [organizationId, queryClient]);

  // Handle date click for quick creation
  const handleDateClick = useCallback((info: any) => {
    if (isMember) return;
    const dateStr = info.dateStr;
    navigate(`/organization/create-event?date=${encodeURIComponent(dateStr)}`);
  }, [navigate, isMember]);

  // Calendar navigation
  const handlePrev = () => calendarRef.current?.getApi().prev();
  const handleNext = () => calendarRef.current?.getApi().next();
  const handleToday = () => calendarRef.current?.getApi().today();
  const handleViewChange = (view: CalendarViewType) => {
    setCurrentView(view);
    calendarRef.current?.getApi().changeView(view);
  };

  const handleDatesSet = useCallback((info: any) => {
    setCurrentTitle(info.view.title);
  }, []);

  // Expose toolbar controls to parent
  useEffect(() => {
    if (toolbarRef) {
      toolbarRef.current = {
        handlePrev: () => calendarRef.current?.getApi().prev(),
        handleNext: () => calendarRef.current?.getApi().next(),
        handleToday: () => calendarRef.current?.getApi().today(),
        handleViewChange: (view: CalendarViewType) => {
          setCurrentView(view);
          calendarRef.current?.getApi().changeView(view);
        },
        currentView,
        currentTitle,
      };
    }
  }, [toolbarRef, currentView, currentTitle]);

  // Custom event render
  const renderEventContent = useCallback((eventInfo: any) => {
    const { isPast, isLive, participantCount, capacity } = eventInfo.event.extendedProps;
    const isMonthView = eventInfo.view.type === 'dayGridMonth';

    if (isMonthView) {
      return (
        <div className="flex items-center gap-1 px-1 py-0.5 w-full overflow-hidden">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            isPast ? "bg-muted-foreground/50" : isLive ? "bg-green-500" : "bg-primary"
          )} />
          <span className="text-xs font-medium truncate">{eventInfo.event.title}</span>
        </div>
      );
    }

    return (
      <div className="p-1.5 w-full h-full overflow-hidden">
        <p className="text-xs font-semibold truncate leading-tight">{eventInfo.event.title}</p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
          {eventInfo.timeText}
        </p>
        {participantCount > 0 && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {participantCount}{capacity ? `/${capacity}` : ''} part.
          </p>
        )}
      </div>
    );
  }, []);

  return (
    <div>
      {/* FullCalendar */}
      <div className="fc-notion-theme rounded-lg border border-border overflow-hidden bg-background">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={currentView}
          locale="fr"
          firstDay={1}
          events={calendarEvents}
          headerToolbar={false}
          height="auto"
          contentHeight="auto"
          aspectRatio={1.8}
          editable={!isMember}
          droppable={!isMember}
          eventStartEditable={!isMember}
          eventDurationEditable={!isMember}
          selectable={!isMember}
          selectMirror={true}
          dayMaxEvents={3}
          moreLinkText={(n) => `+${n} autres`}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          dateClick={handleDateClick}
          datesSet={handleDatesSet}
          eventContent={renderEventContent}
          nowIndicator={true}
          allDaySlot={true}
          allDayText="Journée"
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          slotDuration="00:30:00"
          slotLabelInterval="01:00"
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
          dayHeaderFormat={{
            weekday: 'short',
            day: 'numeric',
          }}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
          buttonText={{
            today: "Aujourd'hui",
            month: 'Mois',
            week: 'Semaine',
            day: 'Jour',
          }}
        />
      </div>
    </div>
  );
}
