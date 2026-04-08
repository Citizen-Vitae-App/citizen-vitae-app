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
import { useIsMobile } from '@/hooks/use-mobile';
import { QuickEventDialog } from './QuickEventDialog';

interface EditEventData {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  is_public: boolean | null;
  description?: string | null;
  capacity?: number | null;
  require_approval?: boolean | null;
  allow_self_certification?: boolean | null;
  cover_image_url?: string | null;
  cause_theme_id?: string | null;
}

interface CalendarEvent {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
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

export const VIEW_LABELS_SHORT: Record<CalendarViewType, string> = {
  dayGridMonth: 'M',
  timeGridWeek: 'S',
  timeGridDay: 'J',
};

export function EventCalendarView({ events, organizationId, participantCounts, isMember = false, onToolbarReady, onStateChange }: EventCalendarViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const calendarRef = useRef<FullCalendar>(null);
  const [currentView, setCurrentView] = useState<CalendarViewType>('dayGridMonth');
  const [currentTitle, setCurrentTitle] = useState('');
  const [quickEvent, setQuickEvent] = useState<{ isOpen: boolean; date: Date; editEvent?: EditEventData; position?: { top: number; left: number; cellWidth: number; cellHeight: number } }>({ isOpen: false, date: new Date() });
  const [previewOverride, setPreviewOverride] = useState<{ id: string; start: string; end: string } | null>(null);
  const PHANTOM_ID = '__phantom__';

  // Convert events to FullCalendar format, applying live preview overrides
  const calendarEvents = (() => {
    const mapped = events.map(event => {
      const now = new Date();
      const override = previewOverride && previewOverride.id === event.id ? previewOverride : null;
      const startStr = override ? override.start : event.start_date;
      const endStr = override ? override.end : event.end_date;
      const start = new Date(startStr);
      const end = new Date(endStr);
      const isPast = end < now;
      const isLive = start <= now && end >= now;

      // Get cause theme color (first theme if multiple)
      const causeTheme = event.event_cause_themes?.[0]?.cause_themes;
      const themeColor = causeTheme?.color || null;

      // Past events: light tinted background, dark text for readability
      const bgColor = isPast
        ? (themeColor ? `${themeColor}20` : 'hsl(var(--muted))')
        : (themeColor || undefined);
      const txtColor = isPast
        ? 'hsl(var(--foreground))'
        : (themeColor ? '#fff' : undefined);

      return {
        id: event.id,
        title: event.name,
        start: startStr,
        end: endStr,
        backgroundColor: bgColor,
        borderColor: isPast ? 'transparent' : (themeColor || undefined),
        textColor: txtColor,
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

    // Add phantom event during creation mode
    if (quickEvent.isOpen && !quickEvent.editEvent && previewOverride?.id === PHANTOM_ID) {
      mapped.push({
        id: PHANTOM_ID,
        title: '(Nouvel événement)',
        start: previewOverride.start,
        end: previewOverride.end,
        backgroundColor: 'hsla(var(--primary) / 0.35)',
        borderColor: 'hsl(var(--primary))',
        textColor: 'hsl(var(--primary))',
        extendedProps: {
          location: '',
          is_public: true,
          organization_id: organizationId,
          participantCount: 0,
          capacity: null,
          isPast: false,
          isLive: false,
          themeColor: null,
          themeName: null,
          isPhantom: true,
        },
        editable: true,
      } as typeof mapped[0]);
    }

    return mapped;
  })();

  // Handle event click — open edit popover (or re-focus phantom)
  const handleEventClick = useCallback((info: any) => {
    const eventId = info.event.id;
    
    // Phantom event: just re-focus the popover, don't navigate
    if (eventId === PHANTOM_ID) {
      return;
    }
    
    if (isMember) {
      navigate(`/organization/events/${info.event.id}/edit`);
      return;
    }
    const originalEvent = events.find(e => e.id === eventId);
    if (!originalEvent) {
      navigate(`/organization/events/${eventId}/edit`);
      return;
    }

    const causeThemeId = originalEvent.event_cause_themes?.[0]?.cause_themes?.id || null;
    const el = info.el as HTMLElement;
    const rect = el.getBoundingClientRect();

    setQuickEvent({
      isOpen: true,
      date: new Date(originalEvent.start_date),
      editEvent: {
        id: originalEvent.id,
        name: originalEvent.name,
        start_date: originalEvent.start_date,
        end_date: originalEvent.end_date,
        location: originalEvent.location,
        latitude: originalEvent.latitude,
        longitude: originalEvent.longitude,
        is_public: originalEvent.is_public,
        capacity: originalEvent.capacity,
        cover_image_url: originalEvent.cover_image_url,
        cause_theme_id: causeThemeId,
      },
      position: { top: rect.top, left: rect.right, cellWidth: rect.width, cellHeight: rect.height },
    });
  }, [events, isMember, navigate]);

  // Handle event drag & drop (date change)
  const handleEventDrop = useCallback(async (info: any) => {
    const eventId = info.event.id;
    const newStart = info.event.start?.toISOString();
    const newEnd = info.event.end?.toISOString() || newStart;

    // Phantom event: update preview + popover state only, no DB call
    if (eventId === PHANTOM_ID) {
      setPreviewOverride({ id: PHANTOM_ID, start: newStart, end: newEnd });
      setQuickEvent(prev => ({ ...prev, date: info.event.start }));
      // Dispatch time update to QuickEventDialog
      const s = info.event.start;
      const e = info.event.end || s;
      window.dispatchEvent(new CustomEvent('quick-event-time-range', {
        detail: {
          startTime: `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`,
          endTime: `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`,
        }
      }));
      return;
    }

    // If popover is open for this event, update popover state instead of closing
    if (quickEvent.isOpen && quickEvent.editEvent?.id === eventId) {
      const el = info.el as HTMLElement;
      const rect = el.getBoundingClientRect();
      setQuickEvent(prev => ({
        ...prev,
        date: info.event.start,
        editEvent: prev.editEvent ? { ...prev.editEvent, start_date: newStart, end_date: newEnd } : undefined,
        position: { top: rect.top, left: rect.right, cellWidth: rect.width, cellHeight: rect.height },
      }));
    }

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
  }, [organizationId, queryClient, quickEvent]);

  // Handle event resize (duration change)
  const handleEventResize = useCallback(async (info: any) => {
    const eventId = info.event.id;
    const newStart = info.event.start?.toISOString();
    const newEnd = info.event.end?.toISOString();

    // Phantom event: update preview + popover state only, no DB call
    if (eventId === PHANTOM_ID) {
      setPreviewOverride({ id: PHANTOM_ID, start: newStart!, end: newEnd! });
      const s = info.event.start;
      const e = info.event.end;
      window.dispatchEvent(new CustomEvent('quick-event-time-range', {
        detail: {
          startTime: `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`,
          endTime: `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`,
        }
      }));
      return;
    }

    // If popover is open for this event, update popover state
    if (quickEvent.isOpen && quickEvent.editEvent?.id === eventId) {
      setQuickEvent(prev => ({
        ...prev,
        date: info.event.start,
        editEvent: prev.editEvent ? { ...prev.editEvent, start_date: newStart!, end_date: newEnd! } : undefined,
      }));
    }

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

  // Handle date click for quick creation — use mouse position for precise placement
  const handleDateClick = useCallback((info: any) => {
    if (isMember) return;
    const clickDate = info.date as Date;
    const jsEvent = info.jsEvent as MouseEvent;
    const dayEl = info.dayEl as HTMLElement;
    const rect = dayEl?.getBoundingClientRect();

    setQuickEvent({
      isOpen: true,
      date: clickDate,
      position: {
        top: jsEvent.clientY,
        left: rect ? rect.right : jsEvent.clientX,
        cellWidth: rect ? rect.width : 0,
        cellHeight: 0,
      },
    });
  }, [isMember]);

  // Handle drag-to-select for creating events with a specific time range
  const handleSelect = useCallback((info: any) => {
    if (isMember) return;
    const startDate = info.start as Date;
    const endDate = info.end as Date;
    const jsEvent = info.jsEvent as MouseEvent | undefined;

    // Use LOCAL date (not UTC) for DOM column lookup — FullCalendar uses local dates in data-date attributes
    const year = startDate.getFullYear();
    const month = String(startDate.getMonth() + 1).padStart(2, '0');
    const day = String(startDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayEl = document.querySelector(`.fc-timegrid-col[data-date="${dateStr}"]`) as HTMLElement
      || document.querySelector(`.fc-day[data-date="${dateStr}"]`) as HTMLElement;
    const rect = dayEl?.getBoundingClientRect();

    // Vertical position: use mouse Y if available, otherwise midpoint of the selection highlight
    let topY: number;
    if (jsEvent && jsEvent.clientY) {
      topY = jsEvent.clientY;
    } else {
      // Fallback: find the FC highlight element for the selection
      const highlight = document.querySelector('.fc-highlight') as HTMLElement;
      if (highlight) {
        const hRect = highlight.getBoundingClientRect();
        topY = hRect.top + hRect.height / 2;
      } else {
        topY = rect?.top || 300;
      }
    }

    setQuickEvent({
      isOpen: true,
      date: startDate,
      position: {
        top: topY,
        left: rect ? rect.right : (jsEvent ? jsEvent.clientX : 400),
        cellWidth: rect ? rect.width : 0,
        cellHeight: 0,
      },
    });

    // Send the time range to the QuickEventDialog
    setTimeout(() => {
      const startH = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
      const endH = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      window.dispatchEvent(new CustomEvent('quick-event-time-range', { detail: { startTime: startH, endTime: endH } }));
    }, 50);
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
      <div className={cn("p-1.5 w-full h-full overflow-hidden")}>
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

  const hasInternalTimeGridScroll = !isMobile && currentView !== 'dayGridMonth';

  return (
    <div className={currentView === 'dayGridMonth' ? 'overflow-x-hidden' : ''}>
      {/* FullCalendar */}
      <div className={cn(
        "fc-notion-theme bg-background sm:rounded-lg sm:border sm:border-border border-y border-border",
        isMobile ? '-mx-4 overflow-x-hidden' : 'mx-0',
        currentView !== 'dayGridMonth' && !isMobile && 'overflow-x-visible',
        hasInternalTimeGridScroll && 'h-[calc(100vh-16rem)] min-h-[560px]',
        currentView === 'dayGridMonth' ? 'fc-month-view' : 'fc-time-view'
      )}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={currentView}
          locale="fr"
          firstDay={1}
          events={calendarEvents}
          headerToolbar={false}
          height={hasInternalTimeGridScroll ? '100%' : 'auto'}
          contentHeight={hasInternalTimeGridScroll ? undefined : 'auto'}
          stickyHeaderDates={true}
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
          select={handleSelect}
          datesSet={handleDatesSet}
          eventContent={renderEventContent}
          eventDidMount={(info: any) => {
            if (info.event.extendedProps?.isPhantom) {
              info.el.classList.add('fc-phantom-event');
            }
          }}
          nowIndicator={true}
          allDaySlot={false}
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          slotDuration="00:30:00"
          snapDuration="00:15:00"
          scrollTime="08:00:00"
          scrollTimeReset={true}
          slotLabelInterval="01:00"
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
          views={{
            dayGridMonth: {
              dayHeaderFormat: { weekday: isMobile ? 'narrow' : 'short' },
            },
            timeGridWeek: {
              dayHeaderFormat: { weekday: isMobile ? 'narrow' : 'short', day: 'numeric' },
            },
            timeGridDay: {
              dayHeaderFormat: { weekday: isMobile ? 'short' : 'long', day: 'numeric', month: isMobile ? 'short' : 'long' },
            },
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
        onClose={() => {
          setQuickEvent(prev => ({ ...prev, isOpen: false }));
          setPreviewOverride(null);
        }}
        date={quickEvent.date}
        organizationId={organizationId}
        position={quickEvent.position}
        editEvent={quickEvent.editEvent}
        onEventPreview={(start, end) => {
          if (quickEvent.editEvent) {
            setPreviewOverride({ id: quickEvent.editEvent.id, start, end });
          } else {
            // Creation mode: show phantom event
            setPreviewOverride({ id: PHANTOM_ID, start, end });
          }
        }}
      />
    </div>
  );
}
