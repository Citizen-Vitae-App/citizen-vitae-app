import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface TimePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
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

// Validate time string format and values
const isValidTime = (time: string): boolean => {
  if (!time) return true; // Empty is considered valid (will use placeholder)
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
};

// Try to normalize partial time inputs (e.g., "8:3" -> "08:30", "14:5" -> "14:50", "8:" -> "08:00")
const normalizeTime = (time: string): string | null => {
  if (!time) return null;
  
  // Already valid format
  if (isValidTime(time)) {
    // Normalize to HH:MM format (add leading zero if needed)
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const hours = match[1].padStart(2, '0');
      return `${hours}:${match[2]}`;
    }
    return time;
  }
  
  // Try to fix partial inputs like "8:3" -> "08:30"
  const partialMatch = time.match(/^(\d{1,2}):(\d{1})$/);
  if (partialMatch) {
    const hours = parseInt(partialMatch[1], 10);
    const minuteDigit = partialMatch[2];
    if (hours >= 0 && hours <= 23) {
      const normalizedHours = partialMatch[1].padStart(2, '0');
      return `${normalizedHours}:${minuteDigit}0`;
    }
  }
  
  // Try to fix inputs like "8:" or "14:" -> "08:00" or "14:00"
  const hoursOnlyMatch = time.match(/^(\d{1,2}):?$/);
  if (hoursOnlyMatch) {
    const hours = parseInt(hoursOnlyMatch[1], 10);
    if (hours >= 0 && hours <= 23) {
      const normalizedHours = hoursOnlyMatch[1].padStart(2, '0');
      return `${normalizedHours}:00`;
    }
  }
  
  return null; // Cannot normalize
};

// Parse time string to minutes for scroll positioning
const timeToMinutes = (time: string): number | null => {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

export function TimePickerInput({ 
  value, 
  onChange, 
  onBlur, 
  placeholder = "HH:MM",
  className 
}: TimePickerInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const [lastValidValue, setLastValidValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update last valid value when value changes externally and is valid
  useEffect(() => {
    if (isValidTime(value) && value) {
      setLastValidValue(value);
      setIsInvalid(false);
    }
  }, [value]);

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

  const handleSelect = (time: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent blur from firing first
    onChange(time);
    setLastValidValue(time);
    setIsInvalid(false);
    setIsOpen(false);
  };

  // Check if input is a partial time entry in progress (e.g., "8:3", "8:", "14")
  const isPartialTimeEntry = (time: string): boolean => {
    return /^(\d{1,2}):?(\d{0,1})$/.test(time);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Check validity for visual feedback (but allow typing)
    // Don't show error for partial entries like "8:3" - user is still typing
    if (newValue && !isValidTime(newValue) && !isPartialTimeEntry(newValue)) {
      setIsInvalid(true);
    } else {
      setIsInvalid(false);
      if (newValue && isValidTime(newValue)) {
        setLastValidValue(newValue);
      }
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    // Delay to allow click on dropdown item
    setTimeout(() => {
      // Try to normalize the input first (e.g., "8:3" -> "08:30")
      const normalized = normalizeTime(value);
      if (normalized && isValidTime(normalized)) {
        onChange(normalized);
        setLastValidValue(normalized);
        setIsInvalid(false);
      } else if (isInvalid || (value && !isValidTime(value))) {
        // If current value is invalid and cannot be normalized, revert to last valid value
        onChange(lastValidValue);
        setIsInvalid(false);
      }
      if (onBlur) onBlur();
    }, 150);
  };

  return (
    <div ref={containerRef} className="relative">
      {isInvalid && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded whitespace-nowrap z-50">
          Heure incorrecte
        </div>
      )}
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
          isInvalid && "bg-destructive text-destructive-foreground hover:bg-destructive",
          className
        )}
      />
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border border-border rounded-md shadow-lg overflow-hidden">
          <ScrollArea className="h-[200px]" ref={scrollAreaRef}>
            <div className="py-1">
              {TIME_SLOTS.map((time, index) => {
                const isSelected = value === time;
                
                return (
                  <button
                    key={time}
                    data-index={index}
                    type="button"
                    onMouseDown={(e) => handleSelect(time, e)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                      isSelected && "bg-accent"
                    )}
                  >
                    <span className="tabular-nums">{time}</span>
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
