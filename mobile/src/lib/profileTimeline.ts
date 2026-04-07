import type { CertifiedExperience, ManualExperience } from '@/hooks/useCitizenProfile';

export type ProfileTimelineEntry =
  | { kind: 'certified'; data: CertifiedExperience; sortKey: number }
  | { kind: 'manual'; data: ManualExperience; sortKey: number };

export function buildProfileTimeline(
  certified: CertifiedExperience[],
  manual: ManualExperience[]
): ProfileTimelineEntry[] {
  const c = certified.map((data) => ({
    kind: 'certified' as const,
    data,
    sortKey: new Date(data.attended_at).getTime(),
  }));
  const m = manual.map((data) => ({
    kind: 'manual' as const,
    data,
    sortKey: new Date(data.start_year, data.start_month - 1, 15).getTime(),
  }));
  return [...c, ...m].sort((a, b) => b.sortKey - a.sortKey);
}
