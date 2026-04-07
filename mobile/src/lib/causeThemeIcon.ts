import { MaterialCommunityIcons } from '@expo/vector-icons';

/** Icône Lucide côté web → glyphe MaterialCommunityIcons (causes / thèmes). */
export function causeThemeMciName(name: string): keyof typeof MaterialCommunityIcons.glyphMap {
  const map: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    Leaf: 'leaf',
    GraduationCap: 'school',
    Heart: 'heart',
    HeartPulse: 'heart-pulse',
    Palette: 'palette',
    Dumbbell: 'dumbbell',
    PawPrint: 'paw',
    Briefcase: 'briefcase',
    Home: 'home',
    Users: 'account-group',
  };
  return map[name] ?? 'tag-heart';
}
