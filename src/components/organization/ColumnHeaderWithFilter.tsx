import React, { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ArrowUp,
  ArrowDown,
  MoreVertical,
  X,
  CalendarIcon
} from 'lucide-react';
import { format, parse, isValid } from 'date-fns';

interface EventFilters {
  statuses: string[];
  visibilities: string[];
  participantsOperator: 'gte' | 'lte' | 'eq' | null;
  participantsValue: number | null;
  dateOperator: 'after' | 'before' | 'range' | null;
  dateValue: Date | null;
  dateEndValue: Date | null;
}

type SortField = 'title' | 'date' | 'status' | 'visibility' | 'location' | 'participants' | null;
type SortDirection = 'asc' | 'desc';
type FilterPanelType = 'status' | 'visibility' | 'participants' | 'date' | null;

interface ColumnHeaderWithFilterProps {
  label: string;
  field: SortField;
  filterType: 'status' | 'visibility' | 'participants' | 'date';
  icon?: React.ReactNode;
  filters: EventFilters;
  setFilters: React.Dispatch<React.SetStateAction<EventFilters>>;
  sortField: SortField;
  sortDirection: SortDirection;
  toggleSort: (field: SortField, direction?: SortDirection) => void;
  openFilterPanel: FilterPanelType;
  setOpenFilterPanel: React.Dispatch<React.SetStateAction<FilterPanelType>>;
}

// Parse date from DD/MM/YY format
const parseDateInput = (value: string): Date | null => {
  if (!value) return null;
  
  // Try parsing DD/MM/YY
  const parsed = parse(value, 'dd/MM/yy', new Date());
  if (isValid(parsed)) return parsed;
  
  // Try parsing DD/MM/YYYY
  const parsedFull = parse(value, 'dd/MM/yyyy', new Date());
  if (isValid(parsedFull)) return parsedFull;
  
  return null;
};

// Format date to DD/MM/YY
const formatDateInput = (date: Date | null): string => {
  if (!date) return '';
  return format(date, 'dd/MM/yy');
};

// DateInputWithCalendar component
const DateInputWithCalendar = memo(({ 
  value, 
  onChange, 
  placeholder = "JJ/MM/AA" 
}: { 
  value: Date | null; 
  onChange: (date: Date | null) => void;
  placeholder?: string;
}) => {
  const [inputValue, setInputValue] = useState(formatDateInput(value));
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    const parsed = parseDateInput(newValue);
    if (parsed) {
      onChange(parsed);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onChange(date);
      setInputValue(formatDateInput(date));
    }
    setCalendarOpen(false);
  };

  // Update input when value prop changes
  React.useEffect(() => {
    setInputValue(formatDateInput(value));
  }, [value]);

  return (
    <div className="flex gap-1 items-center">
      <Input
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="h-8 flex-1 text-sm"
      />
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end" onOpenAutoFocus={(e) => e.preventDefault()}>
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={handleCalendarSelect}
            className="pointer-events-auto"
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
});
DateInputWithCalendar.displayName = 'DateInputWithCalendar';

export const ColumnHeaderWithFilter = memo(({ 
  label, 
  field, 
  filterType,
  icon,
  filters,
  setFilters,
  sortField,
  sortDirection,
  toggleSort,
  openFilterPanel,
  setOpenFilterPanel
}: ColumnHeaderWithFilterProps) => {
  const isActive = sortField === field;
  const hasFilter = filterType === 'status' ? filters.statuses.length > 0 :
                   filterType === 'visibility' ? filters.visibilities.length > 0 :
                   filterType === 'participants' ? filters.participantsOperator !== null :
                   filterType === 'date' ? filters.dateOperator !== null : false;

  const isOpen = openFilterPanel === filterType;

  return (
    <div className="flex items-center gap-1 group">
      {icon}
      <span className="whitespace-nowrap">{label}</span>
      <Popover open={isOpen} onOpenChange={(open) => setOpenFilterPanel(open ? filterType : null)}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-5 w-5 ml-0.5 ${isActive || hasFilter || isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
          >
            <MoreVertical className={`h-3.5 w-3.5 ${isActive || hasFilter ? 'text-primary' : 'text-muted-foreground'}`} />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          {/* Sort section */}
          <div className="p-2 border-b border-border">
            <p className="text-xs text-muted-foreground font-medium mb-1.5 px-1">Trier</p>
            <div className="flex flex-col gap-1">
              <Button 
                variant={sortField === field && sortDirection === 'asc' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="w-full justify-start h-7 text-xs"
                onClick={() => toggleSort(field, 'asc')}
              >
                <ArrowUp className="h-3 w-3 mr-1" />
                Croissant
              </Button>
              <Button 
                variant={sortField === field && sortDirection === 'desc' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="w-full justify-start h-7 text-xs"
                onClick={() => toggleSort(field, 'desc')}
              >
                <ArrowDown className="h-3 w-3 mr-1" />
                Décroissant
              </Button>
            </div>
          </div>
          
          {/* Filter section */}
          <div className="p-2">
            <p className="text-xs text-muted-foreground font-medium mb-1.5 px-1">Filtrer</p>
            
            {filterType === 'status' && (
              <div className="space-y-1">
                {['À venir', 'En cours', 'Passé'].map(status => {
                  const isSelected = filters.statuses.includes(status);
                  return (
                    <button 
                      key={status} 
                      className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-muted rounded text-left"
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          statuses: isSelected 
                            ? prev.statuses.filter(s => s !== status)
                            : [...prev.statuses, status]
                        }));
                      }}
                    >
                      <div className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                        {isSelected && <span className="text-primary-foreground text-xs">✓</span>}
                      </div>
                      <span className="text-sm">{status}</span>
                    </button>
                  );
                })}
                {filters.statuses.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start text-xs h-7 mt-1"
                    onClick={() => setFilters(prev => ({ ...prev, statuses: [] }))}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Réinitialiser
                  </Button>
                )}
              </div>
            )}
            
            {filterType === 'visibility' && (
              <div className="space-y-1">
                {[{ value: 'public', label: 'Public' }, { value: 'private', label: 'Privé' }].map(({ value, label }) => {
                  const isSelected = filters.visibilities.includes(value);
                  return (
                    <button 
                      key={value} 
                      className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-muted rounded text-left"
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          visibilities: isSelected 
                            ? prev.visibilities.filter(s => s !== value)
                            : [...prev.visibilities, value]
                        }));
                      }}
                    >
                      <div className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                        {isSelected && <span className="text-primary-foreground text-xs">✓</span>}
                      </div>
                      <span className="text-sm">{label}</span>
                    </button>
                  );
                })}
                {filters.visibilities.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start text-xs h-7 mt-1"
                    onClick={() => setFilters(prev => ({ ...prev, visibilities: [] }))}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Réinitialiser
                  </Button>
                )}
              </div>
            )}
            
            {filterType === 'participants' && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[
                    { value: 'eq', label: '=' },
                    { value: 'gte', label: '≥' },
                    { value: 'lte', label: '≤' }
                  ].map(({ value, label }) => (
                    <Button
                      key={value}
                      variant={filters.participantsOperator === value ? 'secondary' : 'outline'}
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => setFilters(prev => ({ 
                        ...prev, 
                        participantsOperator: prev.participantsOperator === value ? null : value as 'gte' | 'lte' | 'eq'
                      }))}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <Input 
                  type="number" 
                  placeholder="Valeur"
                  value={filters.participantsValue ?? ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    participantsValue: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  className="h-8"
                  disabled={filters.participantsOperator === null}
                />
                {filters.participantsOperator !== null && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start text-xs h-7"
                    onClick={() => setFilters(prev => ({ ...prev, participantsOperator: null, participantsValue: null }))}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Réinitialiser
                  </Button>
                )}
              </div>
            )}
            
            {filterType === 'date' && (
              <div className="space-y-3">
                {/* Avant */}
                <div className="space-y-1">
                  <button
                    className={`text-sm font-medium w-full text-left px-1 py-0.5 rounded ${filters.dateOperator === 'before' ? 'text-primary' : 'text-foreground hover:text-primary'}`}
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      dateOperator: prev.dateOperator === 'before' ? null : 'before',
                      dateValue: prev.dateOperator === 'before' ? null : prev.dateValue,
                      dateEndValue: null
                    }))}
                  >
                    Avant
                  </button>
                  {filters.dateOperator === 'before' && (
                    <DateInputWithCalendar
                      value={filters.dateValue}
                      onChange={(date) => setFilters(prev => ({ ...prev, dateValue: date }))}
                    />
                  )}
                </div>

                {/* Après */}
                <div className="space-y-1">
                  <button
                    className={`text-sm font-medium w-full text-left px-1 py-0.5 rounded ${filters.dateOperator === 'after' ? 'text-primary' : 'text-foreground hover:text-primary'}`}
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      dateOperator: prev.dateOperator === 'after' ? null : 'after',
                      dateValue: prev.dateOperator === 'after' ? null : prev.dateValue,
                      dateEndValue: null
                    }))}
                  >
                    Après
                  </button>
                  {filters.dateOperator === 'after' && (
                    <DateInputWithCalendar
                      value={filters.dateValue}
                      onChange={(date) => setFilters(prev => ({ ...prev, dateValue: date }))}
                    />
                  )}
                </div>

                {/* Période */}
                <div className="space-y-1">
                  <button
                    className={`text-sm font-medium w-full text-left px-1 py-0.5 rounded ${filters.dateOperator === 'range' ? 'text-primary' : 'text-foreground hover:text-primary'}`}
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      dateOperator: prev.dateOperator === 'range' ? null : 'range',
                      dateValue: prev.dateOperator === 'range' ? null : prev.dateValue,
                      dateEndValue: prev.dateOperator === 'range' ? null : prev.dateEndValue
                    }))}
                  >
                    Période
                  </button>
                  {filters.dateOperator === 'range' && (
                    <div className="space-y-2 pl-2">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Début :</span>
                        <DateInputWithCalendar
                          value={filters.dateValue}
                          onChange={(date) => setFilters(prev => ({ ...prev, dateValue: date }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Fin :</span>
                        <DateInputWithCalendar
                          value={filters.dateEndValue}
                          onChange={(date) => setFilters(prev => ({ ...prev, dateEndValue: date }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {filters.dateOperator !== null && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start text-xs h-7"
                    onClick={() => setFilters(prev => ({ ...prev, dateOperator: null, dateValue: null, dateEndValue: null }))}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Réinitialiser
                  </Button>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});

ColumnHeaderWithFilter.displayName = 'ColumnHeaderWithFilter';

export type { EventFilters, SortField, SortDirection, FilterPanelType };
