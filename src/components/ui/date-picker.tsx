import * as React from "react";
import { format, parse, isValid, isAfter, isBefore } from "date-fns";
import { fr } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  maxDate?: Date;
  minDate?: Date;
  className?: string;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "JJ/MM/AAAA",
  disabled = false,
  maxDate,
  minDate,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [displayMonth, setDisplayMonth] = React.useState(() => {
    if (date) return new Date(date.getFullYear(), date.getMonth(), 1);
    if (maxDate) return new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });

  // Synchroniser l'input avec la date sélectionnée
  React.useEffect(() => {
    if (date && isValid(date)) {
      setInputValue(format(date, "dd/MM/yyyy"));
    }
  }, [date]);

  // Parser et valider l'entrée utilisateur
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Auto-formatage: ajouter des slashes automatiquement
    const cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length >= 2 && !value.includes("/")) {
      const formatted = cleanValue.slice(0, 2) + "/" + cleanValue.slice(2);
      setInputValue(formatted);
    } else if (cleanValue.length >= 4 && value.split("/").length < 3) {
      const formatted = cleanValue.slice(0, 2) + "/" + cleanValue.slice(2, 4) + "/" + cleanValue.slice(4, 8);
      setInputValue(formatted);
    }
  };

  const handleInputBlur = () => {
    if (!inputValue.trim()) {
      onDateChange(undefined);
      return;
    }

    // Essayer de parser la date
    const parsed = parse(inputValue, "dd/MM/yyyy", new Date());
    
    if (isValid(parsed)) {
      // Vérifier les limites
      if (maxDate && isAfter(parsed, maxDate)) {
        setInputValue(date ? format(date, "dd/MM/yyyy") : "");
        return;
      }
      if (minDate && isBefore(parsed, minDate)) {
        setInputValue(date ? format(date, "dd/MM/yyyy") : "");
        return;
      }
      onDateChange(parsed);
      setDisplayMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    } else {
      // Remettre la valeur précédente si invalide
      setInputValue(date ? format(date, "dd/MM/yyyy") : "");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputBlur();
    }
  };

  // Générer les années pour le select (de minYear à maxYear)
  const minYear = minDate?.getFullYear() || 1920;
  const maxYear = maxDate?.getFullYear() || new Date().getFullYear();
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  // Générer les jours du mois affiché
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    // Ajuster pour commencer par Lundi (0 = Lundi, 6 = Dimanche)
    return day === 0 ? 6 : day - 1;
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
    
    // Vérifier les limites
    if (maxDate && isAfter(newDate, maxDate)) return;
    if (minDate && isBefore(newDate, minDate)) return;
    
    onDateChange(newDate);
    setOpen(false);
  };

  const handleMonthChange = (monthIndex: number) => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), monthIndex, 1));
  };

  const handleYearChange = (year: number) => {
    setDisplayMonth(new Date(year, displayMonth.getMonth(), 1));
  };

  const handlePrevMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1));
  };

  const isDayDisabled = (day: number) => {
    const dayDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
    if (maxDate && isAfter(dayDate, maxDate)) return true;
    if (minDate && isBefore(dayDate, minDate)) return true;
    return false;
  };

  const isDaySelected = (day: number) => {
    if (!date) return false;
    return (
      date.getDate() === day &&
      date.getMonth() === displayMonth.getMonth() &&
      date.getFullYear() === displayMonth.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === displayMonth.getMonth() &&
      today.getFullYear() === displayMonth.getFullYear()
    );
  };

  // Empêcher le scroll du body quand le popover est ouvert
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const daysInMonth = getDaysInMonth(displayMonth.getFullYear(), displayMonth.getMonth());
  const firstDayOfMonth = getFirstDayOfMonth(displayMonth.getFullYear(), displayMonth.getMonth());
  const weekDays = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-2">
        {/* Input pour saisie directe */}
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="h-12 text-base flex-1"
          maxLength={10}
        />

        {/* Bouton pour ouvrir le calendrier */}
        <Popover open={open} onOpenChange={setOpen} modal={true}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-12 px-3 flex-shrink-0"
              disabled={disabled}
              type="button"
              aria-label="Ouvrir le calendrier"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="ml-2 hidden sm:inline">Calendrier</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 z-[100]"
            align="end"
            side="bottom"
            sideOffset={8}
            avoidCollisions={true}
            collisionPadding={16}
          >
            {/* Calendrier personnalisé léger */}
            <div className="p-4 bg-background rounded-lg border shadow-lg min-w-[300px]">
              {/* Header avec navigation et selects */}
              <div className="flex items-center justify-between mb-4">
                {/* Bouton précédent */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handlePrevMonth}
                  type="button"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>

                {/* Selects mois/année */}
                <div className="flex gap-2">
                  <select
                    value={displayMonth.getMonth()}
                    onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                    className="bg-background border border-input rounded-md px-2 py-1.5 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {months.map((month, index) => (
                      <option key={month} value={index}>
                        {month}
                      </option>
                    ))}
                  </select>

                  <select
                    value={displayMonth.getFullYear()}
                    onChange={(e) => handleYearChange(parseInt(e.target.value))}
                    className="bg-background border border-input rounded-md px-2 py-1.5 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bouton suivant */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleNextMonth}
                  type="button"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>

              {/* Jours de la semaine */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Grille des jours */}
              <div className="grid grid-cols-7 gap-1">
                {/* Cases vides avant le premier jour */}
                {Array.from({ length: firstDayOfMonth }, (_, i) => (
                  <div key={`empty-${i}`} className="h-9 w-9" />
                ))}

                {/* Jours du mois */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const isDisabled = isDayDisabled(day);
                  const isSelected = isDaySelected(day);
                  const isTodayDay = isToday(day);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayClick(day)}
                      disabled={isDisabled}
                      className={cn(
                        "h-9 w-9 rounded-md text-sm font-normal transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                        isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
                        isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                        isTodayDay && !isSelected && "bg-accent text-accent-foreground",
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Aide */}
              <p className="text-xs text-muted-foreground text-center mt-3">
                Ou tapez directement : JJ/MM/AAAA
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Affichage de la date en français si sélectionnée */}
      {date && isValid(date) && (
        <p className="text-sm text-muted-foreground mt-1">
          {format(date, "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      )}
    </div>
  );
}
