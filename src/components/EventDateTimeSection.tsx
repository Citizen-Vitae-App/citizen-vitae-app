import { useState, useMemo, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIconLucide, CalendarCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { TimePickerInput } from '@/components/TimePickerInput';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface EventDateTimeSectionProps {
  form: any;
}

// Format duration in human-readable format
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h${remainingMinutes.toString().padStart(2, '0')}`;
};

// Validate time format HH:MM
const isValidTimeFormat = (time: string): boolean => {
  const regex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  return regex.test(time);
};

// Normalize time to HH:MM format
const normalizeTime = (time: string): string => {
  if (!isValidTimeFormat(time)) return time;
  const [hours, minutes] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

export function EventDateTimeSection({ form }: EventDateTimeSectionProps) {
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  const startDate = form.watch('startDate') as Date | undefined;
  const endDate = form.watch('endDate') as Date | undefined;
  const startTime = form.watch('startTime') as string;
  const endTime = form.watch('endTime') as string;

  // Check if event spans multiple days on initial load
  useEffect(() => {
    if (startDate && endDate && !isSameDay(startDate, endDate)) {
      setIsMultiDay(true);
    }
  }, []);

  // Calculate duration for single-day events
  const duration = useMemo(() => {
    if (!startDate || !endDate || !startTime || !endTime) return null;
    if (!isSameDay(startDate, endDate)) return null;
    if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) return null;
    
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;
    
    if (endTotal <= startTotal) return null;
    
    const diffMinutes = endTotal - startTotal;
    // Only show duration for events less than 24h
    if (diffMinutes >= 24 * 60) return null;
    
    return formatDuration(diffMinutes);
  }, [startDate, endDate, startTime, endTime]);

  // Handle multi-day toggle
  const handleMultiDayToggle = (checked: boolean) => {
    setIsMultiDay(checked);
    if (!checked && startDate) {
      // When switching to single day, set end date to start date
      form.setValue('endDate', startDate);
      // Ensure end time is after start time
      if (isValidTimeFormat(startTime) && isValidTimeFormat(endTime)) {
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        const startTotal = startHours * 60 + startMinutes;
        const endTotal = endHours * 60 + endMinutes;
        
        if (endTotal <= startTotal) {
          // Set end time to start time + 1 hour
          const newEndTotal = Math.min(startTotal + 60, 23 * 60 + 45);
          const newEndHours = Math.floor(newEndTotal / 60);
          const newEndMinutes = newEndTotal % 60;
          form.setValue('endTime', `${newEndHours.toString().padStart(2, '0')}:${newEndMinutes.toString().padStart(2, '0')}`);
        }
      }
    }
  };

  // Handle date range selection
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      form.setValue('startDate', range.from);
      if (range.to) {
        form.setValue('endDate', range.to);
      } else {
        form.setValue('endDate', range.from);
      }
    }
  };

  // Handle single date selection
  const handleSingleDateSelect = (date: Date | undefined) => {
    if (date) {
      form.setValue('startDate', date);
      form.setValue('endDate', date);
    }
  };

  // Handle start time change with validation
  const handleStartTimeChange = (value: string) => {
    form.setValue('startTime', value);
    
    // Only validate if it's a valid time format and single-day event
    if (!isMultiDay && startDate && endDate && isSameDay(startDate, endDate) && isValidTimeFormat(value) && isValidTimeFormat(endTime)) {
      const [startHours, startMinutes] = value.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      const startTotal = startHours * 60 + startMinutes;
      const endTotal = endHours * 60 + endMinutes;
      
      if (endTotal <= startTotal) {
        // Set end time to start time + 1 hour
        const newEndTotal = Math.min(startTotal + 60, 23 * 60 + 45);
        const newEndHours = Math.floor(newEndTotal / 60);
        const newEndMinutes = newEndTotal % 60;
        form.setValue('endTime', `${newEndHours.toString().padStart(2, '0')}:${newEndMinutes.toString().padStart(2, '0')}`);
      }
    }
  };

  // Handle end time change with validation
  const handleEndTimeChange = (value: string) => {
    // For single-day events, validate that end time is after start time
    if (!isMultiDay && startDate && endDate && isSameDay(startDate, endDate) && isValidTimeFormat(value) && isValidTimeFormat(startTime)) {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = value.split(':').map(Number);
      const startTotal = startHours * 60 + startMinutes;
      const endTotal = endHours * 60 + endMinutes;
      
      if (endTotal <= startTotal) {
        // Don't update if invalid
        return;
      }
    }
    form.setValue('endTime', value);
  };

  // Handle time input blur to normalize format
  const handleTimeBlur = (fieldName: 'startTime' | 'endTime') => {
    const value = form.getValues(fieldName);
    if (isValidTimeFormat(value)) {
      form.setValue(fieldName, normalizeTime(value));
    }
  };

  const dateRange: DateRange = {
    from: startDate,
    to: endDate,
  };

  return (
    <div className="bg-black/[0.03] rounded-lg px-4 py-4 space-y-3">
      {/* Multi-day toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-normal text-foreground">Événement sur plusieurs jours</span>
        </div>
        <Switch
          checked={isMultiDay}
          onCheckedChange={handleMultiDayToggle}
        />
      </div>

      {/* Date Selection */}
      {isMultiDay ? (
        // Multi-day: Date range picker
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIconLucide className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-normal text-foreground">Période</span>
          </div>
          <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-start text-left font-normal bg-black/5 hover:bg-black/10 border-0 min-w-[200px]"
              >
                {startDate && endDate ? (
                  isSameDay(startDate, endDate) ? (
                    <span className="tabular-nums">{format(startDate, "d MMMM yyyy", { locale: fr })}</span>
                  ) : (
                    <span className="tabular-nums">
                      {format(startDate, "d MMM", { locale: fr })} - {format(endDate, "d MMM yyyy", { locale: fr })}
                    </span>
                  )
                ) : (
                  "Sélectionner les dates"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleDateRangeSelect}
                numberOfMonths={2}
                initialFocus
                className="pointer-events-auto"
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        // Single day: Simple date picker
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIconLucide className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-normal text-foreground">Date</span>
          </div>
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal bg-black/5 hover:bg-black/10 border-0 min-w-[160px]",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <span className="tabular-nums">
                          {field.value ? format(field.value, "d MMMM yyyy", { locale: fr }) : "Date"}
                        </span>
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={handleSingleDateSelect}
                      initialFocus
                      className="pointer-events-auto"
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {/* Time Selection */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-normal text-foreground">Horaires</span>
          {duration && (
            <span className="text-xs text-muted-foreground bg-black/5 px-2 py-0.5 rounded">
              {duration}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Start Time */}
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <TimePickerInput
                    value={field.value}
                    onChange={handleStartTimeChange}
                    onBlur={() => handleTimeBlur('startTime')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <span className="text-muted-foreground">-</span>
          {/* End Time */}
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <TimePickerInput
                    value={field.value}
                    onChange={handleEndTimeChange}
                    onBlur={() => handleTimeBlur('endTime')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* End Date display for multi-day (informative) */}
      {isMultiDay && startDate && endDate && !isSameDay(startDate, endDate) && (
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-1 border-t border-black/5">
          <span>Du {format(startDate, "d MMMM", { locale: fr })} au {format(endDate, "d MMMM yyyy", { locale: fr })}</span>
        </div>
      )}
    </div>
  );
}
