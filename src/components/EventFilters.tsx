import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import * as LucideIcons from 'lucide-react';

interface CauseTheme {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface EventFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
  selectedCauses: string[];
  onCausesChange: (causes: string[]) => void;
}

type TabType = 'dates' | 'mois' | 'flexible';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const EventFilters = ({
  isOpen,
  onClose,
  selectedDates,
  onDatesChange,
  selectedCauses,
  onCausesChange
}: EventFiltersProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('dates');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [causeThemes, setCauseThemes] = useState<CauseTheme[]>([]);

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
    const isSelected = selectedDates.some(d => isSameDay(d, date));
    if (isSelected) {
      onDatesChange(selectedDates.filter(d => !isSameDay(d, date)));
    } else {
      onDatesChange([...selectedDates, date]);
    }
  };

  const handleMonthClick = (monthIndex: number) => {
    const year = currentMonth.getFullYear();
    const start = new Date(year, monthIndex, 1);
    const end = endOfMonth(start);
    // Toggle: if already selected, remove all days of that month
    const monthDays = eachDayOfInterval({ start, end });
    const allSelected = monthDays.every(d => selectedDates.some(sd => isSameDay(sd, d)));
    
    if (allSelected) {
      onDatesChange(selectedDates.filter(sd => !monthDays.some(md => isSameDay(md, sd))));
    } else {
      const newDates = [...selectedDates];
      monthDays.forEach(d => {
        if (!newDates.some(nd => isSameDay(nd, d))) {
          newDates.push(d);
        }
      });
      onDatesChange(newDates);
    }
  };

  const handleCauseToggle = (causeId: string) => {
    if (selectedCauses.includes(causeId)) {
      onCausesChange(selectedCauses.filter(c => c !== causeId));
    } else {
      onCausesChange([...selectedCauses, causeId]);
    }
  };

  const clearFilters = () => {
    onDatesChange([]);
    onCausesChange([]);
  };

  const renderCalendarMonth = (monthDate: Date) => {
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
          {format(monthDate, 'MMMM yyyy', { locale: fr })}
        </h3>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day, i) => (
            <div key={i} className="text-center text-sm text-muted-foreground font-medium py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, monthDate);
            const isSelected = selectedDates.some(d => isSameDay(d, day));
            const isTodayDate = isToday(day);

            return (
              <button
                key={i}
                onClick={() => isCurrentMonth && handleDateClick(day)}
                disabled={!isCurrentMonth}
                className={cn(
                  "h-10 w-10 mx-auto rounded-full text-sm transition-colors",
                  !isCurrentMonth && "text-muted-foreground/30 cursor-default",
                  isCurrentMonth && !isSelected && "hover:bg-muted text-foreground",
                  isSelected && "bg-primary text-primary-foreground",
                  isTodayDate && !isSelected && "ring-1 ring-primary"
                )}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-4 w-4" /> : null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Filtres de recherche</DialogTitle>
        </VisuallyHidden>
        
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
                const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
                const isSelected = monthDays.some(d => selectedDates.some(sd => isSameDay(sd, d)));

                return (
                  <button
                    key={month}
                    onClick={() => handleMonthClick(index)}
                    className={cn(
                      "py-4 px-3 rounded-xl text-sm font-medium transition-colors border",
                      isSelected 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-background border-border hover:border-primary/50"
                    )}
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
                        : "bg-background border-border hover:border-primary/50"
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
            {selectedDates.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedDates.length} date{selectedDates.length > 1 ? 's' : ''}
              </span>
            )}
            {selectedCauses.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedCauses.length} cause{selectedCauses.length > 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={onClose}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Appliquer
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventFilters;