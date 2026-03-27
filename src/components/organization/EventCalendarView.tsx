import { useState, useRef, useCallback, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { QuickEventDialog } from './QuickEventDialog';

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
  event_cause_themes?: {
    cause_themes: {
      id: string;
      name: string;
      color: string;
      icon: string;
    };
  }[];
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

export const VIEW_LABELS: Record<CalendarViewType, string> = {
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
  const [quickEvent, setQuickEvent] = useState<{ isOpen: boolean; date: Date; position?: { top: number; left: number; cellWidth: number; cellHeight: number } }>({ isOpen: false, date: new Date() });

  // Convert events to FullCalendar format
  const calendarEvents = events.map(event => {
    const now = new Date();
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    const isPast = end < now;
    const isLive = start <= now && end >= now;

    // Get cause theme color (first theme if multiple)
    const causeTheme = event.event_cause_themes?.[0]?.cause_themes;
    const themeColor = causeTheme?.color || null;

    return {
      id: event.id,
      title: event.name,
      start: event.start_date,
      end: event.end_date,
      backgroundColor: themeColor || undefined,
      borderColor: themeColor || undefined,
      extendedProps: {
        location: event.location,
        is_public: event.is_public,
        organization_id: event.organization_id,
        participantCount: participantCounts?.get(event.id)?.count || 0,
        capacity: event.capacity,
        isPast,
        isLive,
        themeColor,
        themeName: causeTheme?.name || null,
      },
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
      queryClient.invalidateQueries({ queryKey: ['organization-events', organizationId] });
    } catch (err) {
      logger.error('Error updating event duration:', err);
      toast.error('Erreur lors de la mise à jour');
      info.revert();
    }
  }, [organizationId, queryClient]);

  // Handle date click for quick creation — capture cell rect for positioning
  const handleDateClick = useCallback((info: any) => {
    if (isMember) return;
    const clickDate = info.date as Date;
    const dayEl = info.dayEl as HTMLElement;
    if (dayEl) {
      const rect = dayEl.getBoundingClientRect();
      setQuickEvent({
        isOpen: true,
        date: clickDate,
        position: { top: rect.top, left: rect.right, cellWidth: rect.width, cellHeight: rect.height },
      });
    } else {
      const jsEvent = info.jsEvent as MouseEvent;
      setQuickEvent({
        isOpen: true,
        date: clickDate,
        position: { top: jsEvent.clientY, left: jsEvent.clientX, cellWidth: 0, cellHeight: 0 },
      });
    }
  }, [isMember]);

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
    onToolbarReady?.({
      handlePrev: () => calendarRef.current?.getApi().prev(),
      handleNext: () => calendarRef.current?.getApi().next(),
      handleToday: () => calendarRef.current?.getApi().today(),
      handleViewChange: (view: CalendarViewType) => {
        setCurrentView(view);
        calendarRef.current?.getApi().changeView(view);
      },
    });
  }, [onToolbarReady]);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.({ currentView, currentTitle });
  }, [currentView, currentTitle, onStateChange]);

  // Custom event render
  const renderEventContent = useCallback((eventInfo: any) => {
    const { isPast, participantCount, capacity, themeColor } = eventInfo.event.extendedProps;
    const isMonthView = eventInfo.view.type === 'dayGridMonth';

    if (isMonthView) {
      return (
        <div className={cn("flex items-center gap-1 px-1 py-0.5 w-full overflow-hidden", isPast && "opacity-50")}>
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: themeColor || 'hsl(var(--primary))' }}
          />
          <span className="text-xs font-medium truncate">{eventInfo.event.title}</span>
        </div>
      );
    }

    return (
      <div className={cn("p-1.5 w-full h-full overflow-hidden", isPast && "opacity-50")}>
        <p className="text-xs font-semibold truncate leading-tight">{eventInfo.event.title}</p>
        <p className="text-[10px] opacity-80 truncate mt-0.5">
          {eventInfo.timeText}
        </p>
        {participantCount > 0 && (
          <p className="text-[10px] opacity-80 mt-0.5">
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
      <QuickEventDialog
        isOpen={quickEvent.isOpen}
        onClose={() => setQuickEvent(prev => ({ ...prev, isOpen: false }))}
        date={quickEvent.date}
        organizationId={organizationId}
        position={quickEvent.position}
      />
    </div>
  );
}
