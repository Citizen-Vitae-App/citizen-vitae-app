import { Loader2 } from 'lucide-react';

export function OrganizationTransitionScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
      <p className="text-lg font-medium text-foreground">Chargement du mode Organisation...</p>
    </div>
  );
}
