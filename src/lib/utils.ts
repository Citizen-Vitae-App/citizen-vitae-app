import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Génère un titre court pour l'affichage sur les visuels des cartes événement
 * - Maximum 24 caractères (espaces compris) par défaut
 * - Uniquement des mots complets (pas de coupure en milieu de mot)
 * - Pas de "..." à la fin (pour l'overlay sur l'image)
 */
export function generateShortTitle(name: string, maxChars: number = 24): string {
  const words = name.split(' ');
  let result = '';
  
  for (const word of words) {
    const potentialResult = result ? `${result} ${word}` : word;
    
    if (potentialResult.length <= maxChars) {
      result = potentialResult;
    } else {
      break;
    }
  }
  
  return result || words[0];
}
