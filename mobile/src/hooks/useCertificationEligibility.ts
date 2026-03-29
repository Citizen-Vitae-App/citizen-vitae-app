import { useMemo } from 'react';
import { parseISO, subHours, addHours, format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { calculateDistance } from '@/lib/calculateDistance';

interface Props {
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
const CATCHUP_HOURS_AFTER_END = 1;

export function useCertificationEligibility({
  eventStartDate,
  eventEndDate,
  eventLatitude,
  eventLongitude,
  userLatitude,
  userLongitude,
  isLoadingLocation,
}: Props) {
  return useMemo(() => {
    const now = new Date();
    const startDate = parseISO(eventStartDate);
    const endDate = parseISO(eventEndDate);
    const windowStart = subHours(startDate, HOURS_BEFORE_START);
    const catchupEnd = addHours(endDate, CATCHUP_HOURS_AFTER_END);

    const isWithinTimeWindow = now >= windowStart && now <= catchupEnd;
    const isBeforeWindow = now < windowStart;
    const isAfterEvent = now > catchupEnd;
    const isInCatchupWindow = now > endDate && now <= catchupEnd;

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

    let timeMessage = '';
    if (isBeforeWindow) {
      const isTodayEvent = isSameDay(now, startDate);
      if (isTodayEvent) {
        timeMessage = `Disponible à partir de ${format(windowStart, "HH'h'mm", { locale: fr })}`;
      } else {
        timeMessage = `Disponible le ${format(startDate, 'd MMMM', { locale: fr })}`;
      }
    } else if (isInCatchupWindow) {
      const minutesLeft = Math.round((catchupEnd.getTime() - now.getTime()) / 60000);
      timeMessage = `Rattrapage en cours — ${minutesLeft} min restantes`;
    } else if (isAfterEvent) {
      timeMessage = "L'événement est terminé";
    }

    let locationMessage = '';
    let needsGeolocation = false;

    if (!isLoadingLocation && distanceFromEvent !== null && !isWithinLocationRadius) {
      const distanceKm = (distanceFromEvent / 1000).toFixed(1);
      locationMessage = `Distance actuelle : ${distanceKm} km. Tu dois être à moins de 500 m du lieu.`;
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
      isInCatchupWindow,
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
}
