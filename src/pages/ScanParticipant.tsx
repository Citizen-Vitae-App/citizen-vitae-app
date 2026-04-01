import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, UserCheck, AlertCircle, XCircle, Award, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QRScanner } from '@/components/QRScanner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Navbar } from '@/components/Navbar';
import { OrganizationBottomNav } from '@/components/OrganizationBottomNav';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ScanResult {
  success: boolean;
  scan_type?: 'arrival' | 'departure' | 'already_certified' | 'cooldown';
  certified?: boolean;
  registration_id?: string;
  user_name?: string;
  user_avatar?: string;
  event_name?: string;
  arrival_time?: string;
  departure_time?: string;
  duration?: string;
  error?: string;
  message?: string;
  scan_progress?: string;
  cooldown_remaining_seconds?: number;
  next_scan_available_at?: string;
}

export default function ScanParticipant() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [cooldownMap, setCooldownMap] = useState<Record<string, number>>({});
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);
  
  const lastProcessedTokenRef = useRef<string | null>(null);
  const cooldownIntervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Cooldown timer
  useEffect(() => {
    if (cooldownSeconds > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setCooldownSeconds(prev => {
          if (prev <= 1) {
            if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    };
  }, [cooldownSeconds]);

  const generateCertificate = async (registrationId: string) => {
    if (!user) return;
    setIsGeneratingCert(true);
    try {
      const { data: certData, error: certError } = await supabase.functions.invoke('generate-certificate', {
        body: {
          registration_id: registrationId,
          validated_by: user.id,
        },
      });
      if (certError) {
        logger.error('Error generating certificate:', certError);
      } else {
        logger.debug('Certificate generated:', certData?.certificate_url);
      }
    } catch (err) {
      logger.error('Error generating certificate:', err);
    } finally {
      setIsGeneratingCert(false);
    }
  };

  const handleScan = useCallback(async (qrContent: string) => {
    if (isProcessing) return;
    
    logger.debug('[QR-SCAN] Raw content:', qrContent);
    
    let qrToken: string;
    
    if (qrContent.includes('/verify/') && qrContent.includes('token=')) {
      try {
        const url = new URL(qrContent);
        qrToken = url.searchParams.get('token') || '';
        logger.debug('[QR-SCAN] Extracted token from URL:', qrToken.substring(0, 20) + '...');
      } catch {
        qrToken = qrContent;
      }
    } else {
      try {
        const parsed = JSON.parse(qrContent);
        qrToken = parsed.qr_token || parsed.token || qrContent;
        logger.debug('[QR-SCAN] Parsed from JSON:', qrToken.substring(0, 20) + '...');
      } catch {
        qrToken = qrContent;
        logger.debug('[QR-SCAN] Using raw content as token');
      }
    }
    
    if (!qrToken) {
      setLastResult({
        success: false,
        error: 'QR code invalide - token manquant',
      });
      return;
    }

    if (qrToken === lastProcessedTokenRef.current && cooldownSeconds > 0) {
      logger.debug('[QR-SCAN] Ignoring - cooldown active');
      return;
    }
    
    if (qrToken.length < 20) {
      setLastResult({
        success: false,
        error: 'QR code invalide : ce QR ne semble pas provenir de Citizen Vitae',
      });
      return;
    }
    
    setIsProcessing(true);
    setLastResult(null);
    setShowAnimation(false);
    lastProcessedTokenRef.current = qrToken;
    
    try {
      const { data, error } = await supabase.functions.invoke('didit-verification', {
        body: {
          action: 'verify-qr-code',
          qr_token: qrToken,
        },
      });
      
      if (error) throw error;
      
      const result = data as ScanResult;
      setLastResult(result);
      
      if (result.success) {
        setShowAnimation(true);
        
        if (result.scan_type === 'arrival') {
          toast.success(`Arrivée enregistrée pour ${result.user_name} (1/2)`);
          if (result.cooldown_remaining_seconds || result.next_scan_available_at) {
            const remaining = result.cooldown_remaining_seconds || 60;
            setCooldownSeconds(remaining);
          }
        } else if (result.scan_type === 'departure') {
          toast.success(`Certification complète pour ${result.user_name} !`);
          if (result.registration_id) {
            await generateCertificate(result.registration_id);
          }
        }
      } else if (result.scan_type === 'cooldown') {
        const remaining = result.cooldown_remaining_seconds || 30;
        setCooldownSeconds(remaining);
        toast.info(`Attendez encore ${remaining}s avant le second scan`);
        lastProcessedTokenRef.current = null;
      } else {
        toast.error(result.error || 'Erreur lors du scan');
      }
    } catch (err: any) {
      logger.error('Scan error:', err);

      let errorData: ScanResult | undefined;
      try {
        if (err?.context?.body) {
          const text = await new Response(err.context.body).text();
          errorData = JSON.parse(text);
        }
      } catch { /* ignore parse errors */ }

      if (errorData?.scan_type === 'cooldown') {
        setLastResult(errorData);
        const remaining = errorData.cooldown_remaining_seconds || 30;
        setCooldownSeconds(remaining);
        toast.info(`Attendez encore ${remaining}s avant le second scan`);
        lastProcessedTokenRef.current = null;
      } else {
        setLastResult({
          success: false,
          error: err.message || 'Erreur lors de la vérification du QR code',
        });
        toast.error('Erreur lors du scan');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, cooldownSeconds, user]);

  const resetScan = () => {
    setLastResult(null);
    setShowAnimation(false);
    lastProcessedTokenRef.current = null;
  };

  const formatTime = (isoString: string) => {
    return format(new Date(isoString), 'HH:mm', { locale: fr });
  };

  const renderArrivalResult = (result: ScanResult) => (
    <div className="flex flex-col items-center text-center gap-4">
      {/* Animated success ring */}
      <div className={cn(
        "relative w-20 h-20 flex items-center justify-center",
        showAnimation && "animate-in zoom-in-50 duration-500"
      )}>
        <div className={cn(
          "absolute inset-0 rounded-full bg-blue-100",
          showAnimation && "animate-ping opacity-30"
        )} />
        <div className="relative w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
          <UserCheck className="h-8 w-8 text-blue-600" />
        </div>
      </div>
      
      {/* Progress badge */}
      <div className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200",
        showAnimation && "animate-in slide-in-from-bottom-4 duration-500 delay-150"
      )}>
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
        </div>
        <span className="text-sm font-semibold text-blue-700">1/2 scans validés</span>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold">Arrivée enregistrée</h2>
        <p className="text-muted-foreground">{result.event_name}</p>
      </div>
      
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={result.user_avatar || undefined} />
          <AvatarFallback>{result.user_name?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
        <span className="text-lg font-medium">{result.user_name}</span>
      </div>
      
      <div className="w-full space-y-2 text-sm">
        {result.arrival_time && (
          <div className="flex items-center justify-between px-4 py-2 bg-background rounded-lg">
            <span className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Arrivée
            </span>
            <span className="font-medium">{formatTime(result.arrival_time)}</span>
          </div>
        )}
      </div>

      {/* Cooldown indicator */}
      {cooldownSeconds > 0 && (
        <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <Timer className="h-4 w-4" />
            <span className="text-sm font-medium">Prochain scan dans {cooldownSeconds}s</span>
          </div>
          <div className="w-full bg-amber-200 rounded-full h-1.5">
            <div 
              className="bg-amber-500 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${Math.max(0, ((60 - cooldownSeconds) / 60) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Rescannez le QR code du participant après 1 minute pour valider le départ
      </p>
    </div>
  );

  const renderDepartureResult = (result: ScanResult) => (
    <div className="flex flex-col items-center text-center gap-4">
      {/* Animated completion */}
      <div className={cn(
        "relative w-24 h-24 flex items-center justify-center",
        showAnimation && "animate-in zoom-in-0 duration-700"
      )}>
        <div className={cn(
          "absolute inset-0 rounded-full bg-green-100",
          showAnimation && "animate-pulse"
        )} />
        <div className="absolute inset-1 rounded-full bg-green-200/50" />
        <div className="relative w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-200">
          <Award className="h-8 w-8 text-white" />
        </div>
      </div>
      
      {/* Completion badge */}
      <div className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200",
        showAnimation && "animate-in slide-in-from-bottom-4 duration-500 delay-200"
      )}>
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        </div>
        <span className="text-sm font-semibold text-green-700">2/2 scans validés</span>
      </div>
      
      <div className={cn(
        showAnimation && "animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-300"
      )}>
        <h2 className="text-xl font-semibold text-green-700">Certification complète</h2>
        <p className="text-muted-foreground">{result.event_name}</p>
      </div>
      
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 ring-2 ring-green-200">
          <AvatarImage src={result.user_avatar || undefined} />
          <AvatarFallback>{result.user_name?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
        <span className="text-lg font-medium">{result.user_name}</span>
      </div>
      
      <div className="w-full space-y-2 text-sm">
        {result.arrival_time && (
          <div className="flex items-center justify-between px-4 py-2 bg-background rounded-lg">
            <span className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Arrivée
            </span>
            <span className="font-medium">{formatTime(result.arrival_time)}</span>
          </div>
        )}
        {result.departure_time && (
          <div className="flex items-center justify-between px-4 py-2 bg-background rounded-lg">
            <span className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Départ
            </span>
            <span className="font-medium">{formatTime(result.departure_time)}</span>
          </div>
        )}
        {result.duration && (
          <div className="flex items-center justify-between px-4 py-2 bg-green-50 rounded-lg border border-green-100">
            <span className="text-muted-foreground">Durée</span>
            <span className="font-semibold text-green-700">{result.duration}</span>
          </div>
        )}
      </div>

      {isGeneratingCert && (
        <p className="text-xs text-muted-foreground animate-pulse">
          Génération du certificat en cours...
        </p>
      )}
    </div>
  );

  const renderCooldownResult = (result: ScanResult) => (
    <div className="flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
        <Timer className="h-8 w-8 text-amber-600" />
      </div>
      
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200">
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />
        </div>
        <span className="text-sm font-semibold text-blue-700">1/2 scans validés</span>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold">Scan en attente</h2>
        <p className="text-muted-foreground">{result.event_name}</p>
      </div>
      
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={result.user_avatar || undefined} />
          <AvatarFallback>{result.user_name?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
        <span className="text-lg font-medium">{result.user_name}</span>
      </div>

      {cooldownSeconds > 0 && (
        <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <Timer className="h-4 w-4" />
            <span className="text-sm font-medium">Prochain scan dans {cooldownSeconds}s</span>
          </div>
          <div className="w-full bg-amber-200 rounded-full h-2">
            <div 
              className="bg-amber-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${Math.max(0, ((60 - cooldownSeconds) / 60) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-amber-600 mt-2">
            Un délai d'1 minute entre les scans est nécessaire pour garantir l'authenticité
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex flex-col md:container md:mx-auto md:px-4 md:py-6 md:max-w-lg">
        <div className={`flex items-center gap-4 mb-6 px-4 pt-4 md:px-0 md:pt-0 ${!lastResult ? 'hidden md:flex' : ''}`}>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Scanner QR Code</h1>
        </div>

        {lastResult ? (
          <Card className="border-0 shadow-none bg-muted/30">
            <CardContent className="pt-6">
              {lastResult.success && lastResult.scan_type === 'arrival' ? (
                renderArrivalResult(lastResult)
              ) : lastResult.success && lastResult.scan_type === 'departure' ? (
                renderDepartureResult(lastResult)
              ) : lastResult.scan_type === 'cooldown' ? (
                renderCooldownResult(lastResult)
              ) : lastResult.scan_type === 'already_certified' ? (
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-yellow-600" />
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-semibold">Déjà certifié</h2>
                    <p className="text-muted-foreground">{lastResult.event_name}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={lastResult.user_avatar || undefined} />
                      <AvatarFallback>{lastResult.user_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="text-lg font-medium">{lastResult.user_name}</span>
                  </div>
                  
                  <div className="w-full space-y-2 text-sm">
                    {lastResult.arrival_time && (
                      <div className="flex items-center justify-between px-4 py-2 bg-background rounded-lg">
                        <span className="text-muted-foreground">Arrivée</span>
                        <span className="font-medium">{formatTime(lastResult.arrival_time)}</span>
                      </div>
                    )}
                    {lastResult.departure_time && (
                      <div className="flex items-center justify-between px-4 py-2 bg-background rounded-lg">
                        <span className="text-muted-foreground">Départ</span>
                        <span className="font-medium">{formatTime(lastResult.departure_time)}</span>
                      </div>
                    )}
                    {lastResult.duration && (
                      <div className="flex items-center justify-between px-4 py-2 bg-primary/10 rounded-lg">
                        <span className="text-muted-foreground">Durée</span>
                        <span className="font-semibold text-primary">{lastResult.duration}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-semibold text-destructive">Erreur</h2>
                    <p className="text-muted-foreground">{lastResult.error}</p>
                  </div>
                </div>
              )}
              
              <Button 
                onClick={resetScan} 
                className="w-full mt-6"
                variant={lastResult.success ? "default" : "outline"}
              >
                Scanner un autre participant
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex-1 flex flex-col bg-foreground md:bg-transparent">
            <QRScanner onScan={handleScan} isProcessing={isProcessing} autoStart />
          </div>
        )}
      </main>
      
      <OrganizationBottomNav
        activeTab="scan"
        onTabChange={(tab) => navigate(`/organization/dashboard?tab=${tab}`)}
      />
    </div>
  );
}
