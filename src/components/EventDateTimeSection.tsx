import { useState, useMemo, useEffect } from 'react';
import { format, isSameDay, isSameMonth } from 'date-fns';
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

// Format date with abbreviated month if needed to prevent wrapping
const formatDateCompact = (date: Date, showYear: boolean = false): string => {
  const monthFormat = showYear ? "d MMM yyyy" : "d MMM";
  return format(date, monthFormat, { locale: fr });
};

export function EventDateTimeSection({
  form
}: EventDateTimeSectionProps) {
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
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

  // Handle date range selection (for mobile period picker)
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

  // Handle start date selection for multi-day
  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      form.setValue('startDate', date);
      // If end date is before start date, update it
      if (endDate && date > endDate) {
        form.setValue('endDate', date);
      }
      setStartDateOpen(false);
    }
  };

  // Handle end date selection for multi-day
  const handleEndDateSelect = (date: Date | undefined) => {
    if (date) {
      form.setValue('endDate', date);
      setEndDateOpen(false);
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
    to: endDate
  };

  // Format multi-day period display - use abbreviated months if same month to prevent wrapping
  const formatPeriodDisplay = () => {
    if (!startDate || !endDate) return "Sélectionner les dates";
    if (isSameDay(startDate, endDate)) {
      return <span className="tabular-nums">{format(startDate, "d MMMM yyyy", { locale: fr })}</span>;
    }
    
    // If same month, use abbreviated format to prevent 2-line wrapping
    if (isSameMonth(startDate, endDate)) {
      return (
        <span className="tabular-nums">
          {format(startDate, "d", { locale: fr })} - {format(endDate, "d MMM yyyy", { locale: fr })}
        </span>
      );
    }
    
    return (
      <span className="tabular-nums">
        {format(startDate, "d MMM", { locale: fr })} - {format(endDate, "d MMM yyyy", { locale: fr })}
      </span>
    );
  };

  return (
    <div className="bg-black/[0.03] rounded-lg px-4 py-4 space-y-3">
      {/* Multi-day toggle */}
      <div className="flex items-center justify-between h-9">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-normal text-foreground">Événement sur plusieurs jours</span>
        </div>
        <Switch checked={isMultiDay} onCheckedChange={handleMultiDayToggle} />
      </div>

      {/* Date Selection */}
      {/* Date Selection - Fixed height to prevent layout shift */}
      <div className="h-9">
        {isMultiDay ? (
          // Multi-day: Two separate date pickers for start and end
          <div className="flex items-center justify-between gap-2 h-full">
            <div className="flex items-center gap-2 shrink-0">
              <CalendarIconLucide className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-normal text-foreground">Période</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Start Date Picker */}
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="justify-start text-left font-normal bg-black/5 hover:bg-black/10 border-0 px-3 py-2 h-auto rounded-lg text-sm"
                >
                  <span className="tabular-nums">
                    {startDate ? formatDateCompact(startDate) : "Début"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar 
                  mode="single" 
                  selected={startDate} 
                  onSelect={handleStartDateSelect} 
                  initialFocus 
                  className="pointer-events-auto" 
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} 
                />
              </PopoverContent>
            </Popover>
            
            <span className="text-muted-foreground text-sm">-</span>
            
            {/* End Date Picker */}
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="justify-start text-left font-normal bg-black/5 hover:bg-black/10 border-0 px-3 py-2 h-auto rounded-lg text-sm"
                >
                  <span className="tabular-nums">
                    {endDate ? formatDateCompact(endDate, true) : "Fin"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar 
                  mode="single" 
                  selected={endDate} 
                  onSelect={handleEndDateSelect} 
                  initialFocus 
                  className="pointer-events-auto" 
                  disabled={(date) => {
                    const today = new Date(new Date().setHours(0, 0, 0, 0));
                    if (date < today) return true;
                    if (startDate && date < startDate) return true;
                    return false;
                  }} 
                />
              </PopoverContent>
              </Popover>
            </div>
          </div>
        ) : (
          // Single day: Simple date picker
          <div className="flex items-center justify-between h-full">
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
                          "justify-start text-left font-normal bg-black/5 hover:bg-black/10 border-0 min-w-[160px] rounded-lg", 
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
      </div>

      {/* Time Selection */}
      <div className="flex items-center justify-between flex-wrap gap-y-2">
        <div className="flex items-center gap-2 shrink-0">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-normal text-foreground">Horaires</span>
          {duration && (
            <span className="text-xs text-muted-foreground bg-black/5 px-2 py-0.5 rounded whitespace-nowrap">
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
                    className="text-sm md:text-base w-[76px] md:w-[90px]"
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
                    className="text-sm md:text-base w-[76px] md:w-[90px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} 
          />
        </div>
      </div>

      {/* Full date-time display for multi-day events */}
      {isMultiDay && startDate && endDate && !isSameDay(startDate, endDate) && startTime && endTime && (
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-1 border-t border-black/5">
          <span>
            Du {format(startDate, "d MMMM", { locale: fr })} à {startTime} au {format(endDate, "d MMMM yyyy", { locale: fr })} à {endTime}
          </span>
        </div>
      )}
    </div>
  );
}