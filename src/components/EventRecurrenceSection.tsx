import { useState } from 'react';
import { Repeat, CalendarDays, Hash } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { format, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface RecurrenceData {
  isRecurring: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  weekDays: string[];
  endType: 'on_date' | 'after_occurrences';
  endDate?: Date;
  occurrences?: number;
}

interface EventRecurrenceSectionProps {
  value: RecurrenceData;
  onChange: (data: RecurrenceData) => void;
}

const WEEK_DAYS = [
  { value: 'mon', label: 'L' },
  { value: 'tue', label: 'M' },
  { value: 'wed', label: 'M' },
  { value: 'thu', label: 'J' },
  { value: 'fri', label: 'V' },
  { value: 'sat', label: 'S' },
  { value: 'sun', label: 'D' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'jour' },
  { value: 'weekly', label: 'semaine' },
  { value: 'monthly', label: 'mois' },
  { value: 'yearly', label: 'an' },
];

const MAX_OCCURRENCES = 52;

export function EventRecurrenceSection({ value, onChange }: EventRecurrenceSectionProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleToggleRecurring = (checked: boolean) => {
    onChange({
      ...value,
      isRecurring: checked,
      frequency: checked ? (value.frequency || 'weekly') : value.frequency,
      interval: checked ? (value.interval || 1) : value.interval,
      weekDays: checked ? (value.weekDays.length > 0 ? value.weekDays : ['mon']) : value.weekDays,
      endType: checked ? (value.endType === 'on_date' || value.endType === 'after_occurrences' ? value.endType : 'after_occurrences') : value.endType,
      occurrences: checked ? (value.occurrences || 10) : value.occurrences,
      endDate: checked ? (value.endDate || addMonths(new Date(), 3)) : value.endDate,
    });
  };

  const handleFrequencyChange = (frequency: string) => {
    onChange({
      ...value,
      frequency: frequency as RecurrenceData['frequency'],
      weekDays: frequency === 'weekly' ? (value.weekDays.length > 0 ? value.weekDays : ['mon']) : [],
    });
  };

  const handleIntervalChange = (interval: string) => {
    const num = parseInt(interval) || 1;
    onChange({ ...value, interval: Math.min(Math.max(num, 1), 99) });
  };

  const handleWeekDaysChange = (days: string[]) => {
    if (days.length > 0) {
      onChange({ ...value, weekDays: days });
    }
  };

  const handleEndTypeChange = (endType: string) => {
    onChange({
      ...value,
      endType: endType as RecurrenceData['endType'],
      occurrences: endType === 'after_occurrences' ? (value.occurrences || 10) : value.occurrences,
      endDate: endType === 'on_date' ? (value.endDate || addMonths(new Date(), 3)) : value.endDate,
    });
  };

  const handleEndDateChange = (date: Date | undefined) => {
    onChange({ ...value, endDate: date });
    setIsCalendarOpen(false);
  };

  const handleOccurrencesChange = (occurrences: string) => {
    const num = parseInt(occurrences) || 1;
    onChange({ ...value, occurrences: Math.min(Math.max(num, 1), MAX_OCCURRENCES) });
  };

  const getFrequencyLabel = (freq: string, interval: number) => {
    const option = FREQUENCY_OPTIONS.find(f => f.value === freq);
    if (!option) return '';
    return interval > 1 ? `${option.label}s` : option.label;
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Récurrence</h3>
      <div className="bg-black/[0.03] rounded-lg px-4 py-3 space-y-3">
        {/* Line 1: Toggle + Frequency */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Récurrent</span>
            <Switch
              checked={value.isRecurring}
              onCheckedChange={handleToggleRecurring}
            />
          </div>
          
          {value.isRecurring && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tous les</span>
              <Input
                type="number"
                min={1}
                max={99}
                value={value.interval}
                onChange={(e) => handleIntervalChange(e.target.value)}
                className="w-14 h-8 text-center text-sm"
              />
              <Select value={value.frequency} onValueChange={handleFrequencyChange}>
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}{value.interval > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Line 2: Week days (only for weekly) */}
        {value.isRecurring && value.frequency === 'weekly' && (
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="multiple"
              value={value.weekDays}
              onValueChange={handleWeekDaysChange}
              className="justify-start gap-1"
            >
              {WEEK_DAYS.map((day) => (
                <ToggleGroupItem
                  key={day.value}
                  value={day.value}
                  aria-label={day.label}
                  className={cn(
                    "w-8 h-8 rounded-full text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                    "border border-border/50 hover:bg-muted"
                  )}
                >
                  {day.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}

        {/* Line 3: End type */}
        {value.isRecurring && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Fin :</span>
            <Select value={value.endType} onValueChange={handleEndTypeChange}>
              <SelectTrigger className="w-24 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on_date">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    Le
                  </span>
                </SelectItem>
                <SelectItem value="after_occurrences">
                  <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    Après
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {value.endType === 'on_date' && (
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 text-sm justify-start text-left font-normal",
                      !value.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-1 h-3 w-3" />
                    {value.endDate
                      ? format(value.endDate, 'd MMM yyyy', { locale: fr })
                      : 'Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={value.endDate}
                    onSelect={handleEndDateChange}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            )}

            {value.endType === 'after_occurrences' && (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={MAX_OCCURRENCES}
                  value={value.occurrences || 10}
                  onChange={(e) => handleOccurrencesChange(e.target.value)}
                  className="w-16 h-8 text-center text-sm"
                />
                <span className="text-sm text-muted-foreground">fois (max {MAX_OCCURRENCES})</span>
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        {value.isRecurring && (
          <p className="text-xs text-muted-foreground pt-1 border-t border-border/30">
            {value.frequency === 'daily' && (
              <>Tous les {value.interval > 1 ? `${value.interval} jours` : 'jours'}</>
            )}
            {value.frequency === 'weekly' && (
              <>
                Toutes les {value.interval > 1 ? `${value.interval} semaines` : 'semaines'} le{' '}
                {value.weekDays
                  .map((d) => WEEK_DAYS.find((wd) => wd.value === d)?.label)
                  .join(', ')}
              </>
            )}
            {value.frequency === 'monthly' && (
              <>Tous les {value.interval > 1 ? `${value.interval} mois` : 'mois'}</>
            )}
            {value.frequency === 'yearly' && (
              <>Tous les {value.interval > 1 ? `${value.interval} ans` : 'ans'}</>
            )}
            {value.endType === 'on_date' && value.endDate && (
              <> • Jusqu'au {format(value.endDate, 'd MMM yyyy', { locale: fr })}</>
            )}
            {value.endType === 'after_occurrences' && (
              <> • {value.occurrences} occurrences</>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
