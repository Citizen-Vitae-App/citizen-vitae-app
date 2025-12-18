import { useMemo } from 'react';
import { parseISO, subHours, format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { calculateDistance } from '@/lib/utils';

interface UseCertificationEligibilityProps {
  eventStartDate: string;
  eventEndDate: string;
  eventLatitude: number | null;
  eventLongitude: number | null;
  userLatitude: number | null;
  userLongitude: number | null;
  isLoadingLocation: boolean;
}

const RADIUS_METERS = 500;
const HOURS_BEFORE_START = 1;

export const useCertificationEligibility = ({
  eventStartDate,
  eventEndDate,
  eventLatitude,
  eventLongitude,
  userLatitude,
  userLongitude,
  isLoadingLocation,
}: UseCertificationEligibilityProps) => {
  return useMemo(() => {
    const now = new Date();
    const startDate = parseISO(eventStartDate);
    const endDate = parseISO(eventEndDate);
    const windowStart = subHours(startDate, HOURS_BEFORE_START);

    // Time validation
    const isWithinTimeWindow = now >= windowStart && now <= endDate;
    const isBeforeWindow = now < windowStart;
    const isAfterEvent = now > endDate;

    // Location validation
    let distanceFromEvent: number | null = null;
    let isWithinLocationRadius = false;

    if (
      eventLatitude !== null &&
      eventLongitude !== null &&
      userLatitude !== null &&
      userLongitude !== null
    ) {
      distanceFromEvent = calculateDistance(
        userLatitude,
        userLongitude,
        eventLatitude,
        eventLongitude
      );
      isWithinLocationRadius = distanceFromEvent <= RADIUS_METERS;
    }

    // Generate messages
    let timeMessage = '';
    if (isBeforeWindow) {
      const isTodayEvent = isSameDay(now, startDate);
      if (isTodayEvent) {
        // Same day: show time
        timeMessage = `Disponible à partir de ${format(windowStart, "HH'h'mm", { locale: fr })}`;
      } else {
        // Different day: show date
        timeMessage = `Disponible le ${format(startDate, "d MMMM", { locale: fr })}`;
      }
    } else if (isAfterEvent) {
      timeMessage = 'L\'événement est terminé';
    }

    let locationMessage = '';
    let needsGeolocation = false;
    
    if (!isLoadingLocation && distanceFromEvent !== null && !isWithinLocationRadius) {
      const distanceKm = (distanceFromEvent / 1000).toFixed(1);
      locationMessage = `Distance actuelle: ${distanceKm} km. Vous devez être à moins de 500m du lieu.`;
    } else if (!isLoadingLocation && distanceFromEvent === null && eventLatitude && eventLongitude) {
      needsGeolocation = true;
    }

    const isEligible = isWithinTimeWindow && isWithinLocationRadius;

    return {
      isEligible,
      isWithinTimeWindow,
      isWithinLocationRadius,
      distanceFromEvent,
      timeMessage,
      locationMessage,
      isBeforeWindow,
      isAfterEvent,
      windowStart,
      needsGeolocation,
    };
  }, [
    eventStartDate,
    eventEndDate,
    eventLatitude,
    eventLongitude,
    userLatitude,
    userLongitude,
    isLoadingLocation,
  ]);
};
