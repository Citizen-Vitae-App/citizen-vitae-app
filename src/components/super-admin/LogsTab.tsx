import { FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function LogsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[hsl(210,40%,98%)]">Logs système</h2>
        <p className="text-[hsl(215,20.2%,65.1%)]">Historique des actions importantes sur la plateforme</p>
      </div>

      <Card className="bg-[hsl(217.2,32.6%,17.5%)] border-[hsl(217.2,32.6%,20%)]">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-[hsl(217.2,32.6%,25%)] flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-[hsl(215,20.2%,65.1%)]" />
          </div>
          <h3 className="text-lg font-medium text-[hsl(210,40%,98%)] mb-2">Bientôt disponible</h3>
          <p className="text-[hsl(215,20.2%,65.1%)] text-center max-w-md">
            Cette fonctionnalité permettra de consulter l'historique des créations, modifications et suppressions d'organisations, événements et certifications.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
