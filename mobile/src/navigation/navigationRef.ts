import { createNavigationContainerRef } from '@react-navigation/native';
import type { AppStackParamList } from '@/navigation/types';

/** Référence au conteneur actif (app principale) pour naviguer hors d’un écran (ex. modale organisation). */
export const navigationRef = createNavigationContainerRef<AppStackParamList>();
