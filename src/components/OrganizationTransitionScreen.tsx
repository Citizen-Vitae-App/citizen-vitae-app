import { BrandedLoader } from '@/components/BrandedLoader';

export function OrganizationTransitionScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <BrandedLoader size={64} />
      <p className="text-lg font-medium text-foreground mt-6">Chargement du mode Organisation...</p>
    </div>
  );
}
