import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatEventStartDate(iso: string): string {
  return format(parseISO(iso), "d MMMM yyyy 'à' HH'h'mm", { locale: fr });
}
