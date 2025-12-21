import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertCircle, CheckCircle2, XCircle, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VerificationResult {
  success: boolean;
  message: string;
  participant?: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  event?: {
    name: string;
    date: string;
  };
  timestamp?: string;
}

const VerifyParticipant = () => {
  const { registrationId } = useParams<{ registrationId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    const verifyParticipant = async () => {
      if (authLoading) return;

      // If user is not logged in, redirect to auth with return URL
      if (!user) {
        const returnUrl = `/verify/${registrationId}?token=${token}`;
        navigate(`/auth?redirect=${encodeURIComponent(returnUrl)}&message=auth_required`);
        return;
      }

      if (!registrationId || !token) {
        setResult({
          success: false,
          message: 'Lien de vérification invalide. Paramètres manquants.',
        });
        setIsLoading(false);
        return;
      }

      try {
        // First, get the registration and event details to check permissions
        const { data: registration, error: regError } = await supabase
          .from('event_registrations')
          .select(`
            id,
            event_id,
            events (
              id,
              name,
              organization_id,
              organizations (
                id,
                name
              )
            )
          `)
          .eq('id', registrationId)
          .single();

        if (regError || !registration) {
          setResult({
            success: false,
            message: 'Inscription introuvable. Le QR code est peut-être invalide.',
          });
          setIsLoading(false);
          return;
        }

        const event = registration.events as any;
        const organization = event?.organizations;
        setOrganizationName(organization?.name || 'l\'organisation');

        // Check if user is a member of the organization
        const { data: membership } = await supabase
          .from('organization_members')
          .select('id, role')
          .eq('organization_id', event.organization_id)
          .eq('user_id', user.id)
          .single();

        if (!membership) {
          setPermissionError(
            `Vous devez être membre de "${organization?.name || 'l\'organisation'}" pour valider cette présence.`
          );
          setIsLoading(false);
          return;
        }

        // User has permission, proceed with verification
        const { data, error } = await supabase.functions.invoke('didit-verification', {
          body: {
            action: 'verify-qr-code',
            qr_token: token,
          },
        });

        if (error) {
          setResult({
            success: false,
            message: 'Erreur lors de la vérification. Veuillez réessayer.',
          });
        } else if (data?.success) {
          // Parse the response from the edge function
          // Edge function returns: user_name, event_name, scan_type, duration_minutes, etc.
          const nameParts = (data.user_name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          setResult({
            success: true,
            message: data.message || 'Présence validée avec succès',
            participant: {
              firstName,
              lastName,
              avatarUrl: null,
            },
            event: {
              name: data.event_name || event?.name || '',
              date: event?.start_date || '',
            },
            timestamp: new Date().toISOString(),
          });
        } else {
          setResult({
            success: false,
            message: data?.message || 'Vérification échouée',
          });
        }
      } catch (err) {
        console.error('Verification error:', err);
        setResult({
          success: false,
          message: 'Une erreur inattendue s\'est produite.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    verifyParticipant();
  }, [registrationId, token, user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Vérification en cours...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Permission error state
  if (permissionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <ShieldAlert className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-xl">Accès non autorisé</CardTitle>
            <CardDescription className="text-base mt-2">
              {permissionError}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Seuls les administrateurs et responsables de mission de l'organisation peuvent valider les présences.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/')} className="w-full">
                Retour à l'accueil
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/my-missions')}
                className="w-full"
              >
                Mes missions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Result state
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
            result?.success ? 'bg-green-100' : 'bg-destructive/10'
          }`}>
            {result?.success ? (
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            ) : (
              <XCircle className="h-8 w-8 text-destructive" />
            )}
          </div>
          <CardTitle className="text-xl">
            {result?.success ? 'Présence validée' : 'Échec de la vérification'}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {result?.message}
          </CardDescription>
        </CardHeader>

        {result?.success && result.participant && (
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              {result.participant.avatarUrl ? (
                <img 
                  src={result.participant.avatarUrl} 
                  alt="Avatar"
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {result.participant.firstName?.[0]}{result.participant.lastName?.[0]}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium">
                  {result.participant.firstName} {result.participant.lastName}
                </p>
                {result.event && (
                  <p className="text-sm text-muted-foreground">{result.event.name}</p>
                )}
              </div>
            </div>

            {result.timestamp && (
              <p className="text-xs text-muted-foreground text-center">
                Validé le {format(new Date(result.timestamp), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
            )}

            <Button 
              onClick={() => navigate('/organization/scan')} 
              className="w-full"
            >
              Scanner un autre QR code
            </Button>
          </CardContent>
        )}

        {!result?.success && (
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/organization/scan')} className="w-full">
                Retour au scanner
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                className="w-full"
              >
                Retour à l'accueil
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default VerifyParticipant;
