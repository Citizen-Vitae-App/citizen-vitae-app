import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface TimePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  startTime?: string; // For end time picker, to calculate duration
  placeholder?: string;
  className?: string;
}

// Generate time slots in 15-minute intervals
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Parse time string to minutes
const timeToMinutes = (time: string): number | null => {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

// Format duration in human-readable format
const formatDuration = (minutes: number): string => {
  if (minutes <= 0) return '';
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

export function TimePickerInput({ 
  value, 
  onChange, 
  onBlur, 
  startTime,
  placeholder = "HH:MM",
  className 
}: TimePickerInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to current value when opening
  useEffect(() => {
    if (isOpen && scrollAreaRef.current && value) {
      const currentMinutes = timeToMinutes(value);
      if (currentMinutes !== null) {
        // Find the closest 15-min slot
        const closestSlotIndex = Math.round(currentMinutes / 15);
        const element = scrollAreaRef.current.querySelector(`[data-index="${closestSlotIndex}"]`);
        if (element) {
          element.scrollIntoView({ block: 'center', behavior: 'instant' });
        }
      }
    }
  }, [isOpen, value]);

  const handleSelect = (time: string) => {
    onChange(time);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    // Delay to allow click on dropdown item
    setTimeout(() => {
      if (onBlur) onBlur();
    }, 150);
  };

  // Calculate duration from startTime for each slot
  const getDurationLabel = (slotTime: string): string => {
    if (!startTime) return '';
    const startMinutes = timeToMinutes(startTime);
    const slotMinutes = timeToMinutes(slotTime);
    if (startMinutes === null || slotMinutes === null) return '';
    
    const diff = slotMinutes - startMinutes;
    if (diff <= 0) return '';
    if (diff >= 24 * 60) return ''; // Don't show for 24h+
    
    return formatDuration(diff);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        className={cn(
          "bg-black/5 hover:bg-black/10 border-0 w-[90px] text-center tabular-nums",
          className
        )}
      />
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border border-border rounded-md shadow-lg overflow-hidden">
          <ScrollArea className="h-[200px]" ref={scrollAreaRef}>
            <div className="py-1">
              {TIME_SLOTS.map((time, index) => {
                const durationLabel = getDurationLabel(time);
                const isSelected = value === time;
                
                return (
                  <button
                    key={time}
                    data-index={index}
                    type="button"
                    onClick={() => handleSelect(time)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between",
                      isSelected && "bg-accent"
                    )}
                  >
                    <span className="tabular-nums">{time}</span>
                    {durationLabel && (
                      <span className="text-muted-foreground text-xs">
                        ({durationLabel})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
