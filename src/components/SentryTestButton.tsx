import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Composant de test pour vérifier l'intégration Sentry
 * À utiliser uniquement en développement ou par les super admins
 */
export function SentryTestButton() {
  const testErrorBoundary = () => {
    throw new Error('Test Sentry : Erreur de rendu React capturée par ErrorBoundary');
  };

  const testManualError = () => {
    try {
      throw new Error('Test Sentry : Erreur manuelle capturée');
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          test: 'manual-error',
          component: 'SentryTestButton',
        },
        extra: {
          timestamp: new Date().toISOString(),
          userAction: 'clicked test button',
        },
      });
      toast.success('Erreur envoyée à Sentry ! Vérifiez votre dashboard Sentry.');
    }
  };

  const testMessage = () => {
    Sentry.captureMessage('Test Sentry : Message informatif', 'info');
    toast.success('Message envoyé à Sentry !');
  };

  const testWarning = () => {
    Sentry.captureMessage('Test Sentry : Avertissement', 'warning');
    toast.success('Avertissement envoyé à Sentry !');
  };

  return (
    <Card className="border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Tests Sentry
        </CardTitle>
        <CardDescription>
          Testez l'intégration Sentry en envoyant des erreurs et messages de test
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            onClick={testManualError}
            variant="outline"
            className="w-full"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Erreur capturée
          </Button>

          <Button
            onClick={testMessage}
            variant="outline"
            className="w-full"
          >
            <Info className="h-4 w-4 mr-2" />
            Message info
          </Button>

          <Button
            onClick={testWarning}
            variant="outline"
            className="w-full"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Avertissement
          </Button>

          <Button
            onClick={testErrorBoundary}
            variant="destructive"
            className="w-full"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Crash ErrorBoundary
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-background/50 p-3 rounded-lg space-y-1">
          <p className="font-semibold">💡 Instructions :</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Cliquez sur un bouton pour tester l'envoi à Sentry</li>
            <li>Vérifiez votre dashboard Sentry dans quelques secondes</li>
            <li>Le bouton "Crash ErrorBoundary" va faire planter l'app (normal)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
