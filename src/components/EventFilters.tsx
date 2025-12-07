import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isAfter, isBefore, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import * as LucideIcons from 'lucide-react';

interface CauseTheme {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface EventFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  selectedCauses: string[];
  onCausesChange: (causes: string[]) => void;
}

type TabType = 'dates' | 'mois' | 'flexible';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// Bleu principal
const PRIMARY_BLUE = '#012573';

const EventFilters = ({
  isOpen,
  onClose,
  dateRange,
  onDateRangeChange,
  selectedCauses,
  onCausesChange
}: EventFiltersProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('dates');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [causeThemes, setCauseThemes] = useState<CauseTheme[]>([]);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchCauseThemes = async () => {
      const { data } = await supabase
        .from('cause_themes')
        .select('*')
        .order('name');
      if (data) setCauseThemes(data);
    };
    fetchCauseThemes();
  }, []);

  const nextMonth = addMonths(currentMonth, 1);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDateClick = (date: Date) => {
    if (!dateRange.start || (dateRange.start && dateRange.end)) {
      // First click or reset: set start date
      onDateRangeChange({ start: date, end: null });
    } else {
      // Second click: set end date
      if (isBefore(date, dateRange.start)) {
        onDateRangeChange({ start: date, end: dateRange.start });
      } else {
        onDateRangeChange({ start: dateRange.start, end: date });
      }
    }
    setHoverDate(null);
  };

  const handleMonthClick = (monthIndex: number) => {
    const year = currentMonth.getFullYear();
    const start = new Date(year, monthIndex, 1);
    const end = endOfMonth(start);
    onDateRangeChange({ start, end });
  };

  const handleCauseToggle = (causeId: string) => {
    if (selectedCauses.includes(causeId)) {
      onCausesChange(selectedCauses.filter(c => c !== causeId));
    } else {
      onCausesChange([...selectedCauses, causeId]);
    }
  };

  const clearFilters = () => {
    onDateRangeChange({ start: null, end: null });
    onCausesChange([]);
    setHoverDate(null);
  };

  // Calculate effective end date (either selected end or hover date for preview)
  const getEffectiveEndDate = () => {
    if (dateRange.end) return dateRange.end;
    if (dateRange.start && hoverDate && isAfter(hoverDate, dateRange.start)) {
      return hoverDate;
    }
    return null;
  };

  const isInRange = (date: Date) => {
    if (!dateRange.start) return false;
    const effectiveEnd = getEffectiveEndDate();
    if (!effectiveEnd) return isSameDay(date, dateRange.start);
    return (isAfter(date, dateRange.start) || isSameDay(date, dateRange.start)) && 
           (isBefore(date, effectiveEnd) || isSameDay(date, effectiveEnd));
  };

  const isRangeStart = (date: Date) => dateRange.start && isSameDay(date, dateRange.start);
  const isRangeEnd = (date: Date) => {
    const effectiveEnd = getEffectiveEndDate();
    return effectiveEnd && isSameDay(date, effectiveEnd);
  };
  
  const isRangeMiddle = (date: Date) => {
    if (!dateRange.start) return false;
    const effectiveEnd = getEffectiveEndDate();
    if (!effectiveEnd) return false;
    return isAfter(date, dateRange.start) && isBefore(date, effectiveEnd);
  };

  const handleDayMouseEnter = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    if (dateRange.start && !dateRange.end) {
      setHoverDate(date);
    }
  };

  const handleDayMouseLeave = () => {
    // Don't clear hover immediately, only when leaving the calendar area
  };

  // Check if we should show the range background connectors
  const shouldShowRangeBackground = () => {
    return getEffectiveEndDate() !== null;
  };

  const renderCalendarMonth = (monthDate: Date) => {
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    // Group days by week
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    const showBackground = shouldShowRangeBackground();

    return (
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-foreground mb-4 text-center capitalize">
          {format(monthDate, 'MMMM yyyy', { locale: fr })}
        </h3>
        <div className="grid grid-cols-7 gap-0 mb-2">
          {WEEKDAYS.map((day, i) => (
            <div key={i} className="text-center text-sm text-muted-foreground font-medium py-2">
              {day}
            </div>
          ))}
        </div>
        <div 
          className="flex flex-col"
          onMouseLeave={() => setHoverDate(null)}
        >
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7">
              {week.map((day, dayIndex) => {
                const isCurrentMonth = isSameMonth(day, monthDate);
                const inRange = isInRange(day);
                const isStart = isRangeStart(day);
                const isEnd = isRangeEnd(day);
                const isMiddle = isRangeMiddle(day);
                const isTodayDate = isToday(day);
                const isHovering = hoverDate && isSameDay(day, hoverDate) && !dateRange.end;

                // Determine if this is a hover preview vs confirmed selection
                const isPreviewRange = dateRange.start && !dateRange.end && hoverDate;

                return (
                  <div
                    key={dayIndex}
                    className="relative h-10 flex items-center justify-center"
                  >
                    {/* Background connector for range - only show if we have an effective end date */}
                    {isCurrentMonth && inRange && showBackground && (
                      <>
                        {/* Left connector */}
                        {!isStart && (
                          <div 
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-10"
                            style={{ 
                              backgroundColor: isPreviewRange ? 'rgba(1, 37, 115, 0.08)' : 'rgba(1, 37, 115, 0.15)' 
                            }}
                          />
                        )}
                        {/* Right connector */}
                        {!isEnd && (
                          <div 
                            className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-10"
                            style={{ 
                              backgroundColor: isPreviewRange ? 'rgba(1, 37, 115, 0.08)' : 'rgba(1, 37, 115, 0.15)' 
                            }}
                          />
                        )}
                      </>
                    )}

                    {/* Day button */}
                    <button
                      onClick={() => isCurrentMonth && handleDateClick(day)}
                      onMouseEnter={() => handleDayMouseEnter(day, isCurrentMonth)}
                      onMouseLeave={handleDayMouseLeave}
                      disabled={!isCurrentMonth}
                      className={cn(
                        "relative z-10 h-10 w-10 text-sm transition-all flex items-center justify-center rounded-full",
                        !isCurrentMonth && "text-muted-foreground/30 cursor-default",
                        isCurrentMonth && !inRange && "hover:bg-[rgba(1,37,115,0.1)] text-foreground",
                        isMiddle && !isStart && !isEnd && "text-[#012573] font-medium",
                        (isStart || isEnd) && "text-white font-medium",
                        isTodayDate && !inRange && "ring-1 ring-[#012573]"
                      )}
                      style={{
                        backgroundColor: isStart || isEnd ? PRIMARY_BLUE : 
                                        (isHovering && !dateRange.end ? PRIMARY_BLUE : undefined),
                        color: (isStart || isEnd || (isHovering && !dateRange.end)) ? 'white' : undefined,
                        opacity: isPreviewRange && (isEnd || isMiddle) && !isStart ? 0.85 : 1
                      }}
                    >
                      {format(day, 'd')}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-4 w-4" /> : null;
  };

  const getDateSummary = () => {
    if (!dateRange.start) return null;
    if (!dateRange.end) return format(dateRange.start, 'd MMM yyyy', { locale: fr });
    return `${format(dateRange.start, 'd MMM', { locale: fr })} - ${format(dateRange.end, 'd MMM yyyy', { locale: fr })}`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop transparent pour fermer au clic */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Panel intégré */}
      <div className="fixed left-1/2 -translate-x-1/2 top-20 z-50 w-full max-w-4xl bg-background border border-border rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
        {/* Tabs */}
        <div className="flex justify-center pt-6 pb-4">
          <div className="inline-flex bg-muted rounded-full p-1">
            <button
              onClick={() => setActiveTab('dates')}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-colors",
                activeTab === 'dates' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Dates
            </button>
            <button
              onClick={() => setActiveTab('mois')}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-colors",
                activeTab === 'mois' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Mois
            </button>
            <button
              onClick={() => setActiveTab('flexible')}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-colors",
                activeTab === 'flexible' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Causes
            </button>
          </div>
        </div>

        <div className="px-8 pb-6">
          {activeTab === 'dates' && (
            <div className="flex items-start gap-8">
              <button 
                onClick={handlePrevMonth}
                className="mt-8 p-2 hover:bg-muted rounded-full transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              
              <div className="flex-1 flex gap-8">
                {renderCalendarMonth(currentMonth)}
                <div className="hidden md:block">
                  {renderCalendarMonth(nextMonth)}
                </div>
              </div>

              <button 
                onClick={handleNextMonth}
                className="mt-8 p-2 hover:bg-muted rounded-full transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          )}

          {activeTab === 'mois' && (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {MONTHS_FR.map((month, index) => {
                const monthStart = new Date(currentMonth.getFullYear(), index, 1);
                const monthEnd = endOfMonth(monthStart);
                const isSelected = dateRange.start && dateRange.end && 
                  isSameDay(dateRange.start, monthStart) && isSameDay(dateRange.end, monthEnd);

                return (
                  <button
                    key={month}
                    onClick={() => handleMonthClick(index)}
                    className={cn(
                      "py-4 px-3 rounded-xl text-sm font-medium transition-colors border",
                      isSelected 
                        ? "text-white border-[#012573]" 
                        : "bg-background border-border hover:border-[#012573]/50"
                    )}
                    style={{
                      backgroundColor: isSelected ? PRIMARY_BLUE : undefined
                    }}
                  >
                    {month}
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'flexible' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {causeThemes.map((cause) => {
                const isSelected = selectedCauses.includes(cause.id);
                return (
                  <button
                    key={cause.id}
                    onClick={() => handleCauseToggle(cause.id)}
                    className={cn(
                      "flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-medium transition-colors border",
                      isSelected 
                        ? "border-2" 
                        : "bg-background border-border hover:border-[#012573]/50"
                    )}
                    style={isSelected ? { 
                      borderColor: cause.color,
                      backgroundColor: `${cause.color}15`
                    } : {}}
                  >
                    <span style={{ color: cause.color }}>
                      {renderIcon(cause.icon)}
                    </span>
                    <span className={isSelected ? "text-foreground" : "text-muted-foreground"}>
                      {cause.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-4 border-t border-border">
          <button
            onClick={clearFilters}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Tout effacer
          </button>
          <div className="flex items-center gap-2">
            {getDateSummary() && (
              <span className="text-sm text-muted-foreground">
                {getDateSummary()}
              </span>
            )}
            {selectedCauses.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedCauses.length} cause{selectedCauses.length > 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: PRIMARY_BLUE }}
            >
              Appliquer
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EventFilters;