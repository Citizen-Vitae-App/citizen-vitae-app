/** Aligné sur `src/components/profile/AddManualExperienceDialog.tsx` (web). */

export const EXPERIENCE_TYPES = [
  { value: 'benevole_permanent', label: 'Bénévole permanent' },
  { value: 'benevole_ponctuel', label: 'Bénévole ponctuel' },
  { value: 'administrateur', label: 'Administrateur·trice' },
  { value: 'membre_actif', label: 'Membre actif' },
  { value: 'service_civique', label: 'Service civique' },
  { value: 'volontariat_international', label: 'Volontariat international' },
  { value: 'responsable_mission', label: 'Responsable de mission' },
  { value: 'stagiaire_associatif', label: 'Stagiaire associatif' },
  { value: 'mentor', label: 'Mentor / Parrain' },
  { value: 'formateur', label: 'Formateur·trice' },
] as const;

export const LOCATION_TYPES = [
  { value: 'onsite', label: 'Sur site' },
  { value: 'hybrid', label: 'Hybride' },
  { value: 'remote', label: 'À distance' },
] as const;

/** Forme courte (profil, tri). Index 1–12. */
export const MONTHS_FR = [
  '',
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

/** Forme longue — alignée sur `AddManualExperienceDialog` (web). Index 1–12. */
export const MONTHS_FULL_FR = [
  '',
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export function experienceTypeLabel(value: string): string {
  return EXPERIENCE_TYPES.find((t) => t.value === value)?.label ?? value;
}
