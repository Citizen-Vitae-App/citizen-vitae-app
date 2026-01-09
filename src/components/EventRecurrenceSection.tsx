import { useState } from 'react';
import { Repeat, CalendarDays } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface RecurrenceData {
  isRecurring: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  weekDays: string[];
  endType: 'never' | 'on_date' | 'after_occurrences';
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

export function EventRecurrenceSection({ value, onChange }: EventRecurrenceSectionProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleToggleRecurring = (checked: boolean) => {
    onChange({
      ...value,
      isRecurring: checked,
      // Set defaults when enabling
      frequency: checked ? (value.frequency || 'weekly') : value.frequency,
      interval: checked ? (value.interval || 1) : value.interval,
      weekDays: checked ? (value.weekDays.length > 0 ? value.weekDays : ['mon']) : value.weekDays,
      endType: checked ? (value.endType || 'never') : value.endType,
    });
  };

  const handleFrequencyChange = (frequency: string) => {
    onChange({
      ...value,
      frequency: frequency as RecurrenceData['frequency'],
      // Reset weekDays if not weekly
      weekDays: frequency === 'weekly' ? (value.weekDays.length > 0 ? value.weekDays : ['mon']) : [],
    });
  };

  const handleIntervalChange = (interval: string) => {
    const num = parseInt(interval) || 1;
    onChange({ ...value, interval: Math.min(Math.max(num, 1), 99) });
  };

  const handleWeekDaysChange = (days: string[]) => {
    // Ensure at least one day is selected
    if (days.length > 0) {
      onChange({ ...value, weekDays: days });
    }
  };

  const handleEndTypeChange = (endType: string) => {
    onChange({
      ...value,
      endType: endType as RecurrenceData['endType'],
      // Set default occurrences if switching to after_occurrences
      occurrences: endType === 'after_occurrences' ? (value.occurrences || 10) : value.occurrences,
    });
  };

  const handleEndDateChange = (date: Date | undefined) => {
    onChange({ ...value, endDate: date });
    setIsCalendarOpen(false);
  };

  const handleOccurrencesChange = (occurrences: string) => {
    const num = parseInt(occurrences) || 1;
    onChange({ ...value, occurrences: Math.min(Math.max(num, 1), 365) });
  };

  const getFrequencyLabel = () => {
    const freq = FREQUENCY_OPTIONS.find(f => f.value === value.frequency);
    return value.interval > 1 ? `${freq?.label}s` : freq?.label;
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Récurrence</h3>
      <div className="bg-black/[0.03] rounded-lg px-4 py-4 space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Événement récurrent</span>
          </div>
          <Switch
            checked={value.isRecurring}
            onCheckedChange={handleToggleRecurring}
          />
        </div>

        {/* Recurrence options - visible only when enabled */}
        {value.isRecurring && (
          <div className="space-y-5 pt-2 border-t border-border/50">
            {/* Frequency selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Répéter tous les</span>
              <Input
                type="number"
                min={1}
                max={99}
                value={value.interval}
                onChange={(e) => handleIntervalChange(e.target.value)}
                className="w-16 h-9 text-center"
              />
              <Select value={value.frequency} onValueChange={handleFrequencyChange}>
                <SelectTrigger className="w-32 h-9">
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

            {/* Week days selector - only for weekly frequency */}
            {value.frequency === 'weekly' && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Le(s) jour(s)</span>
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
                        "w-9 h-9 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                        "border border-border/50 hover:bg-muted"
                      )}
                    >
                      {day.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            )}

            {/* End type selector */}
            <div className="space-y-3">
              <span className="text-sm text-muted-foreground">Se termine</span>
              <RadioGroup
                value={value.endType}
                onValueChange={handleEndTypeChange}
                className="space-y-3"
              >
                {/* Never */}
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="never" id="end-never" />
                  <Label htmlFor="end-never" className="text-sm font-normal cursor-pointer">
                    Jamais
                  </Label>
                </div>

                {/* On date */}
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="on_date" id="end-date" />
                  <Label htmlFor="end-date" className="text-sm font-normal cursor-pointer">
                    Le
                  </Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={value.endType !== 'on_date'}
                        className={cn(
                          "h-9 justify-start text-left font-normal",
                          !value.endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {value.endDate
                          ? format(value.endDate, 'd MMMM yyyy', { locale: fr })
                          : 'Choisir une date'}
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
                </div>

                {/* After occurrences */}
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="after_occurrences" id="end-occurrences" />
                  <Label htmlFor="end-occurrences" className="text-sm font-normal cursor-pointer">
                    Après
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={value.occurrences || 10}
                    onChange={(e) => handleOccurrencesChange(e.target.value)}
                    disabled={value.endType !== 'after_occurrences'}
                    className="w-20 h-9 text-center"
                  />
                  <span className="text-sm text-muted-foreground">occurrences</span>
                </div>
              </RadioGroup>
            </div>

            {/* Summary */}
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                {value.frequency === 'daily' && (
                  <>Répété tous les {value.interval > 1 ? `${value.interval} jours` : 'jours'}</>
                )}
                {value.frequency === 'weekly' && (
                  <>
                    Répété tous les {value.interval > 1 ? `${value.interval} semaines` : 'semaines'} le{' '}
                    {value.weekDays
                      .map((d) => WEEK_DAYS.find((wd) => wd.value === d)?.label)
                      .join(', ')}
                  </>
                )}
                {value.frequency === 'monthly' && (
                  <>Répété tous les {value.interval > 1 ? `${value.interval} mois` : 'mois'}</>
                )}
                {value.frequency === 'yearly' && (
                  <>Répété tous les {value.interval > 1 ? `${value.interval} ans` : 'ans'}</>
                )}
                {value.endType === 'on_date' && value.endDate && (
                  <> jusqu'au {format(value.endDate, 'd MMMM yyyy', { locale: fr })}</>
                )}
                {value.endType === 'after_occurrences' && (
                  <> pour {value.occurrences} occurrences</>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
